import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import type { TextInput } from "react-native";

import { authApi } from "@/api/endpoints/auth";
import { isApiError } from "@/api/errors";
import { Banner, Button, TextField } from "@/components/ui";
import { FormScreen } from "@/components/FormScreen";
import { deviceToken } from "@/features/auth/device";
import { authErrorMessage, refusalMessage } from "@/features/auth/errors";
import { useFinishSignIn } from "@/features/auth/finish";
import { t } from "@/i18n";
import { buzz } from "@/lib/haptics";
import { useSubmit } from "@/lib/use-submit";
import { validateEmail } from "@/lib/validation";

/**
 * Sign in with email and password — how most shops sign in. A shop on a new phone is asked for
 * the code its email was sent (the next screen); a painter goes straight in. An admin, or an
 * account that belongs in another app, is turned away with where it belongs.
 */
export default function EmailSignIn() {
  const router = useRouter();
  const finish = useFinishSignIn();
  const { busy, run } = useSubmit();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = () => {
    const invalid = validateEmail(email);
    if (invalid) {
      setEmailError(t(invalid));
      return;
    }
    if (!password) return;
    void run(async () => {
      setFormError(null);
      try {
        const response = await authApi.login({ email: email.trim().toLowerCase(), password, deviceToken: await deviceToken() });
        const outcome = await finish(response);
        if (outcome.kind === "signedIn") buzz.success();
        if (outcome.kind === "refused") {
          buzz.warning();
          setFormError(refusalMessage(outcome.side));
        }
      } catch (err) {
        buzz.warning();
        if (isApiError(err) && err.status === 401) setFormError(t("auth.email.badCredentials"));
        else setFormError(authErrorMessage(err));
      }
    });
  };

  return (
    <FormScreen
      title={t("auth.email.title")}
      lead={t("auth.email.lead")}
      footer={
        <>
          <Button label={t("auth.email.submit")} onPress={submit} loading={busy} disabled={!email.trim() || !password} testID="email-submit" />
          <Button variant="ghost" label={t("auth.email.useMobile")} onPress={() => router.replace("/phone")} />
        </>
      }
    >
      <TextField
        label={t("fields.email")}
        value={email}
        onChangeText={(next) => {
          setEmail(next);
          setEmailError(null);
        }}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        testID="email-input"
      />
      <TextField
        ref={passwordRef}
        label={t("fields.password")}
        value={password}
        onChangeText={setPassword}
        revealable
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        testID="password-input"
      />
      {formError ? <Banner tone="danger" message={formError} testID="email-error" /> : null}
    </FormScreen>
  );
}
