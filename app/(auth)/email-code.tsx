import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import { authApi } from "@/api/endpoints/auth";
import { Banner, Button, CodeInput, Text, useToast, type CodeInputHandle } from "@/components/ui";
import { FormScreen } from "@/components/FormScreen";
import { authErrorMessage, refusalMessage } from "@/features/auth/errors";
import { useFinishSignIn } from "@/features/auth/finish";
import { formatCountdown, useCountdown } from "@/features/auth/use-countdown";
import { t } from "@/i18n";
import { buzz } from "@/lib/haptics";
import { useSubmit } from "@/lib/use-submit";
import { useTheme } from "@/theme";

/** The backend allows a resend thirty seconds after the last code. */
const RESEND_AFTER = 30;

/**
 * Check your email (shops only). A shop signing in on a phone it hasn't used in 30 days confirms a
 * code its email was sent, as on the website. The answer carries a trusted-phone token, kept so
 * this phone isn't asked again for 30 days. Each resend gives a new challenge, which replaces the
 * old one.
 */
export default function ShopEmailCode() {
  const router = useRouter();
  const toast = useToast();
  const { space } = useTheme();
  const finish = useFinishSignIn();
  const params = useLocalSearchParams<{ challenge?: string; hint?: string }>();

  const codeRef = useRef<CodeInputHandle>(null);
  const [challenge, setChallenge] = useState(params.challenge ?? "");
  const [hint, setHint] = useState(params.hint ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const verifying = useSubmit();
  const resending = useSubmit();
  const countdown = useCountdown(RESEND_AFTER);

  const verify = (entered: string) => {
    if (!challenge || entered.length !== 6) return;
    void verifying.run(async () => {
      setError(null);
      setResendError(null);
      try {
        const outcome = await finish(await authApi.shopEmailCode({ challengeToken: challenge, code: entered }));
        if (outcome.kind === "signedIn") buzz.success();
        if (outcome.kind === "refused") setError(refusalMessage(outcome.side));
      } catch (err) {
        buzz.warning();
        setError(authErrorMessage(err));
        setCode("");
        codeRef.current?.shake();
        codeRef.current?.focus();
      }
    });
  };

  const resend = () => {
    if (!countdown.done || !challenge) return;
    void resending.run(async () => {
      setError(null);
      setResendError(null);
      try {
        const next = await authApi.shopEmailCodeResend(challenge);
        if (next.challengeToken) setChallenge(next.challengeToken);
        if (next.emailHint) setHint(next.emailHint);
        setCode("");
        countdown.restart(RESEND_AFTER);
        toast.show(t("auth.emailCode.resent"), "success");
        codeRef.current?.focus();
      } catch (err) {
        setResendError(authErrorMessage(err));
      }
    });
  };

  if (!challenge) {
    return (
      <FormScreen title={t("auth.emailCode.title")}>
        <Banner tone="warning" message={t("auth.emailCode.lost")}>
          <Button variant="secondary" block={false} label={t("auth.emailCode.startAgain")} onPress={() => router.replace("/welcome")} />
        </Banner>
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title={t("auth.emailCode.title")}
      lead={hint ? t("auth.emailCode.lead", { email: hint }) : t("auth.emailCode.leadNoHint")}
      footer={
        <Button
          label={verifying.busy ? t("auth.code.verifying") : t("common.continue")}
          onPress={() => verify(code)}
          disabled={code.length !== 6}
          loading={verifying.busy}
          testID="email-code-continue"
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
        onComplete={verify}
        error={error}
        editable={!verifying.busy}
        autoFocus
        testID="email-code-input"
      />
      <Text variant="small" tone="soft">
        {t("auth.emailCode.trusted")}
      </Text>
      {resendError ? <Banner tone="danger" message={resendError} /> : null}
      <View>
        {countdown.done ? (
          <Button variant="ghost" block={false} label={t("auth.emailCode.resend")} onPress={resend} loading={resending.busy} />
        ) : (
          <Text variant="small" tone="mute" accessibilityLiveRegion="polite" style={{ paddingVertical: space.xs }}>
            {t("auth.code.resendIn", { time: formatCountdown(countdown.left) })}
          </Text>
        )}
      </View>
    </FormScreen>
  );
}
