import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth';
import { AuthRequestError } from '@/app/auth/authApi';
import { toast } from '@/app/toast';
import BrandLogo from '@/assets/logo/brand-logo.svg?react';
import {
  Button,
  Checkbox,
  Container,
  Field,
  FormRow,
  Grid,
  Input,
  Stack,
  Tabs,
  Typography,
} from '@/atoms';

import s from './AuthPage.module.scss';

const authTabs = [
  { value: 'signin', label: 'Sign in' },
  { value: 'signup', label: 'Create account' },
];

export function AuthPage() {
  const [tab, setTab] = useState('signin');
  const {
    status,
    signIn,
    signUp,
    startGoogleLogin,
    resendConfirmation,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState<string | null>(
    null,
  );
  const [resendStatus, setResendStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [signInValues, setSignInValues] = useState({
    email: '',
    password: '',
  });
  const [signUpValues, setSignUpValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    acceptedTerms: false,
  });

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: { pathname: string } } | null;
    return state?.from?.pathname ?? '/';
  }, [location.state]);

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(redirectTo, { replace: true });
    }
  }, [status, navigate, redirectTo]);

  const handleTabChange = (value: string) => {
    setTab(value);
    setEmailConfirmation(null);
    setResendStatus('idle');
    setResendAvailableAt(null);
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInLoading(true);
    try {
      await signIn(signInValues);
    } catch (err) {
      if (
        err instanceof AuthRequestError &&
        err.status === 403 &&
        err.rawMessage === 'Email is not confirmed.'
      ) {
        setEmailConfirmation(signInValues.email);
        setResendStatus('idle');
        setResendAvailableAt(null);
        return;
      }
      toast.error(
        err instanceof Error ? err.message : 'Unable to sign in.',
      );
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignUpLoading(true);
    const fullName = [signUpValues.firstName, signUpValues.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    try {
      const result = await signUp({
        email: signUpValues.email,
        password: signUpValues.password,
        fullName: fullName || signUpValues.email,
      });
      if (result.requiresEmailConfirmation) {
        setEmailConfirmation(signUpValues.email);
        setResendStatus('idle');
        setResendAvailableAt(null);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to sign up.',
      );
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!emailConfirmation) return;
    setResendStatus('sending');
    try {
      await resendConfirmation({ email: emailConfirmation });
      setResendStatus('sent');
      setResendAvailableAt(Date.now() + 60_000);
      toast.success('Confirmation email sent.');
    } catch (err) {
      setResendStatus('error');
      toast.error(
        err instanceof Error
          ? err.message
          : 'Unable to resend confirmation.',
      );
    }
  };

  useEffect(() => {
    if (!resendAvailableAt) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  const resendSeconds = resendAvailableAt
    ? Math.max(0, Math.ceil((resendAvailableAt - now) / 1000))
    : 0;
  const isResendDisabled = resendStatus === 'sending' || resendSeconds > 0;
  const resendLabel = resendSeconds > 0
    ? `Resend in ${Math.floor(resendSeconds / 60)}:${String(
        resendSeconds % 60,
      ).padStart(2, '0')}`
    : 'Resend confirmation';

  const handleGoogleLogin = async () => {
    try {
      await startGoogleLogin(`${window.location.origin}/auth/callback`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to start Google sign-in.',
      );
    }
  };

  return (
    <div className={s.page}>
      <Container size="wide" className={s.container}>
        <Grid columns={2} gap="48px" className={s.grid}>
          <Stack gap="24px" className={s.intro}>
            <header className={s.logo}>
              <BrandLogo />
            </header>
            <Typography variant="h1">
              Grounded in your sources, shaped by your voice.
            </Typography>
            <Typography variant="proseCompact" readingWidth className={s.copy}>
              Echo helps you move from reading to publishing — without losing
              nuance or sounding like everyone else.
            </Typography>
            <Typography variant="meta" tone="muted">
              Sessions are kept in secure, httpOnly cookies.
            </Typography>
          </Stack>

          <section className={s.panel} aria-label="Authentication">
            <Stack gap="20px">
              <div className={s.panelHeader}>
                <Typography variant="h2">
                  {emailConfirmation
                    ? 'Check your email'
                    : tab === 'signin'
                      ? 'Sign in'
                      : 'Create account'}
                </Typography>
                <Typography variant="body" tone="muted">
                  {emailConfirmation
                    ? 'Open the confirmation link to finish setting up your account.'
                    : tab === 'signin'
                      ? 'Use your email to continue.'
                      : 'Get started in a minute. Echo adapts as you use it.'}
                </Typography>
              </div>

              {emailConfirmation ? null : (
                <div className={s.oauth}>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleGoogleLogin}
                  >
                    Continue with Google
                  </Button>
                  <Tabs
                    items={authTabs}
                    value={tab}
                    onChange={handleTabChange}
                  />
                </div>
              )}

              {emailConfirmation ? (
                <Stack gap="12px">
                  <Typography variant="body">
                    We sent a confirmation link to {emailConfirmation}.
                  </Typography>
                  <Typography variant="meta" tone="muted">
                    Didn’t receive it? Check your spam folder or try again.
                  </Typography>
                  <div className={s.formMeta}>
                    <Button
                      variant="secondary"
                      onClick={handleResendConfirmation}
                      loading={resendStatus === 'sending'}
                      disabled={isResendDisabled}
                    >
                      {resendLabel}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEmailConfirmation(null);
                        setTab('signin');
                      }}
                    >
                      Back to sign in
                    </Button>
                  </div>
                </Stack>
              ) : tab === 'signin' ? (
                <form className={s.form} onSubmit={handleSignIn}>
                  <Field label="Email" labelFor="signin-email">
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@aeraonline.com"
                      autoComplete="email"
                      value={signInValues.email}
                      onChange={(event) =>
                        setSignInValues((values) => ({
                          ...values,
                          email: event.target.value,
                        }))
                      }
                      required
                      fullWidth
                    />
                  </Field>
                  <Field label="Password" labelFor="signin-password">
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={signInValues.password}
                      onChange={(event) =>
                        setSignInValues((values) => ({
                          ...values,
                          password: event.target.value,
                        }))
                      }
                      required
                      fullWidth
                    />
                  </Field>
                  <div className={s.formMeta}>
                    <Checkbox label="Remember this device" />
                    <Button
                      as={Link}
                      to="/auth/forgot"
                      variant="text"
                      size="sm"
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Button type="submit" fullWidth loading={signInLoading}>
                    Sign in
                  </Button>
                </form>
              ) : (
                <form className={s.form} onSubmit={handleSignUp}>
                  <FormRow columns={2}>
                    <Field label="First name" labelFor="signup-first-name">
                      <Input
                        id="signup-first-name"
                        placeholder="Ava"
                        autoComplete="given-name"
                        value={signUpValues.firstName}
                        onChange={(event) =>
                          setSignUpValues((values) => ({
                            ...values,
                            firstName: event.target.value,
                          }))
                        }
                        fullWidth
                      />
                    </Field>
                    <Field label="Last name" labelFor="signup-last-name">
                      <Input
                        id="signup-last-name"
                        placeholder="Brooks"
                        autoComplete="family-name"
                        value={signUpValues.lastName}
                        onChange={(event) =>
                          setSignUpValues((values) => ({
                            ...values,
                            lastName: event.target.value,
                          }))
                        }
                        fullWidth
                      />
                    </Field>
                  </FormRow>
                  <Field label="Email" labelFor="signup-email">
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@aeraonline.com"
                      autoComplete="email"
                      value={signUpValues.email}
                      onChange={(event) =>
                        setSignUpValues((values) => ({
                          ...values,
                          email: event.target.value,
                        }))
                      }
                      required
                      fullWidth
                    />
                  </Field>
                  <Field
                    label="Password"
                    labelFor="signup-password"
                    hint="Use 8+ characters with a mix of letters and numbers."
                  >
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      autoComplete="new-password"
                      value={signUpValues.password}
                      onChange={(event) =>
                        setSignUpValues((values) => ({
                          ...values,
                          password: event.target.value,
                        }))
                      }
                      required
                      fullWidth
                    />
                  </Field>
                  <Checkbox
                    label="I agree to the terms and privacy policy."
                    checked={signUpValues.acceptedTerms}
                    onChange={(event) =>
                      setSignUpValues((values) => ({
                        ...values,
                        acceptedTerms: event.target.checked,
                      }))
                    }
                  />
                  <Button
                    type="submit"
                    fullWidth
                    loading={signUpLoading}
                    disabled={!signUpValues.acceptedTerms}
                  >
                    Create account
                  </Button>
                  <Typography variant="caption" tone="muted">
                    We don’t share your email. You can leave anytime.
                  </Typography>
                </form>
              )}
            </Stack>
          </section>
        </Grid>
      </Container>
    </div>
  );
}
