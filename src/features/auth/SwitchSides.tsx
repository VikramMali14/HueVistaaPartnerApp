import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { painterApi } from "@/api/endpoints/painter";
import { messageFor } from "@/api/errors";
import { useSession } from "@/auth/session";
import { homeFor, otherPartnerSides } from "@/auth/sides";
import { Button, CodeInput, ListGroup, ListRow, Sheet, Text, useToast } from "@/components/ui";
import { t } from "@/i18n";
import { useTheme } from "@/theme";

/**
 * The person's other work, a tap away on Me: each other shop they run, their painter work — and, for
 * a shop owner without a painter side yet, "Work as a painter too", which opens one beside the shop
 * from this shop's session (it has passed the shop's emailed code). A shop on a phone that hasn't
 * confirmed its emailed code lately asks for it here, in a sheet, before the switch goes through.
 */
export function SwitchSides() {
  const router = useRouter();
  const toast = useToast();
  const { space } = useTheme();
  const { profile, switchTo, confirmSwitch, refreshProfile } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<{ challenge: string; hint: string; name: string } | null>(null);
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const sides = otherPartnerSides(profile);
  const canStartPainter =
    profile?.role === "RETAILER" && profile.sides !== undefined && !profile.sides.some((side) => side.kind === "PAINTER");
  if (sides.length === 0 && !canStartPainter) return null;

  const go = async (sideId: string, name: string) => {
    setBusy(sideId);
    try {
      const outcome = await switchTo(sideId);
      if (outcome.kind === "emailCode") {
        setCode("");
        setProblem(null);
        setPending({ challenge: outcome.challenge, hint: outcome.hint, name });
        return;
      }
      router.replace(homeFor(outcome.profile));
    } catch (err) {
      toast.show(messageFor(err, t("sides.failed")), "error");
    } finally {
      setBusy(null);
    }
  };

  const confirm = async (typed: string) => {
    if (!pending || typed.length < 6) return;
    setBusy("code");
    setProblem(null);
    try {
      const signedIn = await confirmSwitch(pending.challenge, typed);
      setPending(null);
      router.replace(homeFor(signedIn));
    } catch (err) {
      setProblem(messageFor(err, t("sides.failed")));
    } finally {
      setBusy(null);
    }
  };

  const startPainter = async () => {
    setBusy("painter");
    try {
      await painterApi.becomePainter();
      const fresh = await refreshProfile();
      const painter = (fresh?.sides ?? []).find((side) => side.kind === "PAINTER");
      if (painter) await go(painter.id, t("sides.painter"));
    } catch (err) {
      toast.show(messageFor(err, t("sides.failed")), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: space.xs }} testID="switch-sides">
      <Text variant="label" tone="mute" accessibilityRole="header" style={{ paddingHorizontal: space.xxs }}>
        {t("sides.title")}
      </Text>
      <ListGroup>
        {sides.map((side) => {
          const name = side.kind === "PAINTER" ? t("sides.painter") : side.label;
          return (
            <ListRow
              key={side.id}
              icon={side.kind === "PAINTER" ? "tool" : "shopping-bag"}
              title={t("sides.switchTo", { name })}
              detail={side.kind === "PAINTER" ? t("sides.painterHint") : side.needsCode ? t("sides.shopHint") : undefined}
              busy={busy === side.id}
              onPress={() => void go(side.id, name)}
              testID={`switch-to-${side.id}`}
            />
          );
        })}
        {canStartPainter ? (
          <ListRow
            icon="tool"
            title={t("sides.startPainter")}
            detail={t("sides.startPainterHint")}
            busy={busy === "painter"}
            onPress={() => void startPainter()}
            testID="start-painter"
          />
        ) : null}
      </ListGroup>

      <Sheet visible={pending !== null} onClose={() => setPending(null)} title={pending ? t("sides.codeTitle", { name: pending.name }) : ""}>
        <View style={{ gap: space.md }}>
          <Text>{t("sides.codeLead", { hint: pending?.hint ?? "" })}</Text>
          <CodeInput
            value={code}
            onChange={setCode}
            onComplete={(typed) => void confirm(typed)}
            label={t("sides.codeLabel")}
            error={problem}
            autoFocus
            testID="switch-code"
          />
          <Button label={t("sides.confirm")} loading={busy === "code"} disabled={code.length < 6} onPress={() => void confirm(code)} />
        </View>
      </Sheet>
    </View>
  );
}
