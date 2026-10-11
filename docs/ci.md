# CI / deploys

All CI, test, lint and check workflows were removed. Only deploy workflows remain:

- `.github/workflows/deploy.yml`: push to `main` deploys the production Worker; push to `cycle/**` deploys the staging Worker. Each job builds as part of deploying.
- `.github/workflows/pb-deploy.yml`: PocketBase deploy to Fly.

There is no `CI required` status check anymore. If it is configured as a required check in repo settings, remove it.
