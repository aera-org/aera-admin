import Logo from '@/assets/logo/logo.png';
import {
  Container,
  Grid,
  Stack,
  Typography,
} from '@/atoms';

import { AuthSignInForm, PROJECT_NAME } from './authShared';
import s from './AuthPage.module.scss';

export function AuthPage() {
  return (
    <div className={s.page}>
      <Container size="wide" className={s.container}>
        <Grid columns={2} gap="48px" className={s.grid}>
          <Stack gap="24px" className={s.intro}>
            <header className={s.logo}>
              <img src={Logo} alt="Logo" />
            </header>
            <Typography variant="h1">{PROJECT_NAME} Admin Console</Typography>
            <Typography variant="proseCompact" readingWidth className={s.copy}>
              Manage characters, send broadcasts, and monitor analytics from one
              console.
            </Typography>
            <Typography variant="meta" tone="muted">
              Sessions are stored in secure, httpOnly cookies.
            </Typography>
          </Stack>

          <section className={s.panel} aria-label="Authentication">
            <AuthSignInForm showRememberDevice />
          </section>
        </Grid>
      </Container>
    </div>
  );
}
