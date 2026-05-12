import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth';
import { toast } from '@/app/toast';
import { Button, Checkbox, Field, Input, Stack, Typography } from '@/atoms';

export const PROJECT_NAME = import.meta.env.VITE_PROJECT_NAME || 'Aera';
const projectNameLowercase = PROJECT_NAME.toLowerCase();

type AuthSignInFormProps = {
  title?: string;
  description?: string;
  showRememberDevice?: boolean;
  submitLabel?: string;
};

export function useAuthRedirect() {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: { pathname: string } } | null;
    return state?.from?.pathname ?? '/';
  }, [location.state]);

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, status]);
}

export function AuthSignInForm({
  title = 'Sign in',
  description = 'Use your email to continue.',
  showRememberDevice = false,
  submitLabel = 'Sign in',
}: AuthSignInFormProps) {
  const { signIn } = useAuth();
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInValues, setSignInValues] = useState({
    email: '',
    password: '',
  });

  useAuthRedirect();

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInLoading(true);
    try {
      await signIn(signInValues);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSignInLoading(false);
    }
  };

  return (
    <Stack gap="20px">
      <div>
        <Typography variant="h2">{title}</Typography>
        {description ? (
          <Typography variant="body" tone="muted">
            {description}
          </Typography>
        ) : null}
      </div>

      <form onSubmit={handleSignIn}>
        <Stack gap="16px">
          <Field label="Email" labelFor="signin-email">
            <Input
              id="signin-email"
              type="email"
              placeholder={`you@${projectNameLowercase}online.com`}
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
          {showRememberDevice ? (
            <Checkbox label="Remember this device" />
          ) : null}
          <Button type="submit" fullWidth loading={signInLoading}>
            {submitLabel}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
