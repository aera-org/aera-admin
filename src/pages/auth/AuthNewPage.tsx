import Logo from '@/assets/logo/logo-x.png';
import { Container, Stack, Typography } from '@/atoms';

import s from './AuthNewPage.module.scss';
import { AuthSignInForm, PROJECT_NAME } from './authShared';

export function AuthNewPage() {
  return (
    <div className={s.page}>
      <Container size="narrow" className={s.container}>
        <div className={s.shell}>
          <Stack gap="32px" className={s.content}>
            <div className={s.logoBlock}>
              <img src={Logo} alt={`${PROJECT_NAME} logo`} className={s.logo} />
              <Typography variant="h3" className={s.projectName}>
                {PROJECT_NAME}
              </Typography>
            </div>

            <div className={s.formCard}>
              <AuthSignInForm submitLabel="Log In" title="Log In" description="" />
            </div>
          </Stack>
        </div>
      </Container>
    </div>
  );
}
