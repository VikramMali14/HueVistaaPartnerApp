import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import { authApi } from "@/api/endpoints/auth";
import type { Side } from "@/auth/sides";
import { Banner, Button, CodeInput, Text, useToast, type CodeInputHandle } from "@/components/ui";
import { FormScreen } from "@/components/FormScreen";
import { deviceToken } from "@/features/auth/device";
import { authErrorMessage, isPhoneOnUnconfirmedAccount, refusalMessage } from "@/features/auth/errors";
import { useFinishSignIn } from "@/features/auth/finish";
import { formatCountdown, secondsParam, useCountdown } from "@/features/auth/use-countdown";
import { t } from "@/i18n";
import { buzz } from "@/lib/haptics";
import { openWebPage, webPages } from "@/lib/open-web";
import { useSubmit } from "@/lib/use-submit";
import { formatMobileForDisplay, isIndianMobile } from "@/lib/validation";
import { useTheme } from "@/theme";

/**
 * Enter the code. Six boxes with SMS autofill; it submits itself on the sixth digit. The code is
 * checked as the partner website checks it (`intent: "shop"`):
 * - a painter's or a shop's number signs in — a shop on a new phone first confirms the code its
 *   email was sent;
 * - a number with no shop and no painter behind it opens nothing, and the screen offers the shop
 *   signup and joining as a painter, on the website;
 * - a number that signs in to somebody at a shop's counter, or to a homeowner, is signed straight
 *   back out, with the app that is theirs named.
 */
export default function Code() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; resendAfter?: string }>();
  const phone = params.phone ?? "";

  // Opened without a number (a stale link, or the app was restarted part-way).
  if (!isIndianMobile(phone)) {
    return (
      <FormScreen title={t("auth.code.title")} backFallback="/phone">
        <Banner tone="warning" message={t("auth.code.lost")}>
          <Button variant="secondary" block={false} label={t("auth.code.enterNumber")} onPress={() => router.replace("/phone")} />
        </Banner>
      </FormScreen>
    );
  }
  return <CodeForPhone phone={phone} resendAfter={secondsParam(params.resendAfter, 30)} />;
}

function CodeForPhone({ phone, resendAfter }: { phone: string; resendAfter: number }) {
  const router = useRouter();
  const toast = useToast();
  const { space } = useTheme();
  const finish = useFinishSignIn();
  const verifying = useSubmit();
  const resending = useSubmit();

  const codeRef = useRef<CodeInputHandle>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  // Nothing opened: no account behind the number, or one that belongs in another app.
  const [noAccount, setNoAccount] = useState(false);
  const [refused, setRefused] = useState<Exclude<Side, "shop" | "painter"> | null>(null);
  // The code was right, but the number is on another account that never confirmed it. Kept: it
  // isn't spent, and "This isn't my account" sends it again.
  const [elsewhere, setElsewhere] = useState<string | null>(null);
  const countdown = useCountdown(resendAfter);

  const verify = (entered: string, notMyAccount = false) => {
    if (entered.length !== 6) return;
    void verifying.run(async () => {
      setError(null);
      setResendError(null);
      setNoAccount(false);
      setRefused(null);
      if (!notMyAccount) setElsewhere(null);
      try {
        const response = await authApi.phoneVerify({
          phone,
          code: entered,
          deviceToken: await deviceToken(),
          ...(notMyAccount ? { notMyAccount: true } : {}),
        });
        const outcome = await finish(response);
        if (outcome.kind === "signedIn") buzz.success();
        if (outcome.kind === "noAccount" || outcome.kind === "refused") {
          buzz.warning();
          setCode("");
          setElsewhere(null);
          if (outcome.kind === "noAccount") setNoAccount(true);
          else setRefused(outcome.side);
        }
        // signedIn: the (auth) layout moves on; emailCode: the hook went to that screen.
      } catch (err) {
        buzz.warning();
        setCode("");
        if (isPhoneOnUnconfirmedAccount(err)) {
          setElsewhere(entered);
          return;
        }
        setElsewhere(null);
        setError(authErrorMessage(err));
        codeRef.current?.shake();
        codeRef.current?.focus();
      }
    });
  };

  const resend = () => {
    if (!countdown.done) return;
    void resending.run(async () => {
      setError(null);
      setResendError(null);
      try {
        const sent = await authApi.phoneStart(phone);
        countdown.restart(sent.resendAfterSeconds);
        setCode("");
        setElsewhere(null);
        toast.show(t("auth.code.resent"), "success");
        codeRef.current?.focus();
      } catch (err) {
        setResendError(authErrorMessage(err));
      }
    });
  };

  const stopped = noAccount || refused !== null;

  return (
    <FormScreen
      title={t("auth.code.title")}
      lead={t("auth.code.sentTo", { phone: `+91 ${formatMobileForDisplay(phone)}` })}
      backFallback="/phone"
      footer={
        <Button
          label={verifying.busy ? t("auth.code.verifying") : t("common.continue")}
          onPress={() => verify(code)}
          disabled={code.length !== 6 || stopped}
          loading={verifying.busy}
          testID="code-continue"
        />
      }
    >
      <CodeInput
        ref={codeRef}
        label={t("fields.code")}
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error) setError(null);
        }}
        onComplete={(entered) => verify(entered)}
        error={error}
        editable={!verifying.busy}
        testID="code-input"
      />

      {noAccount ? (
        <Banner tone="warning" message={t("auth.code.noAccount")} testID="code-no-account">
          <Button variant="secondary" block={false} icon="shopping-bag" label={t("auth.code.startShop")} onPress={() => void openWebPage(webPages.shopTrial)} />
          <Button variant="secondary" block={false} icon="award" label={t("auth.code.becomePainter")} onPress={() => void openWebPage(webPages.painterJoin)} />
          <Button variant="ghost" block={false} label={t("auth.code.otherNumber")} onPress={() => router.replace("/phone")} />
        </Banner>
      ) : null}
      {refused ? (
        <Banner tone="warning" message={refusalMessage(refused)} testID="code-refused">
          <Button variant="ghost" block={false} label={t("auth.code.otherNumber")} onPress={() => router.replace("/phone")} />
        </Banner>
      ) : null}
      {elsewhere ? (
        <Banner tone="warning" message={t("auth.code.unconfirmedElsewhere")} testID="code-elsewhere">
          <Button variant="secondary" block={false} label={t("auth.code.useEmail")} onPress={() => router.replace("/email")} disabled={verifying.busy} />
          <Button
            variant="ghost"
            block={false}
            label={t("auth.code.notMine")}
            onPress={() => verify(elsewhere, true)}
            loading={verifying.busy}
            testID="code-not-mine"
          />
        </Banner>
      ) : null}
      {resendError ? <Banner tone="danger" message={resendError} /> : null}

      <View style={{ gap: space.xs }}>
        {countdown.done ? (
          <Button variant="ghost" block={false} label={t("auth.code.resend")} onPress={resend} loading={resending.busy} testID="code-resend" />
        ) : (
          <Text variant="small" tone="mute" accessibilityLiveRegion="polite">
            {t("auth.code.resendIn", { time: formatCountdown(countdown.left) })}
          </Text>
        )}
        <Button
          variant="ghost"
          block={false}
          label={t("auth.code.changeNumber")}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/phone"))}
        />
      </View>
    </FormScreen>
  );
}
