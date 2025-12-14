# TODO

## Phase 1: Core Setup
- [ ] Initialize Node.js + TypeScript project
- [ ] Set up Express server with CORS
- [ ] Create basic project structure

## Phase 2: Repository Management
- [ ] `POST /api/repos` — Clone/fetch repo, store metadata
- [ ] `GET /api/repos` — Return list of added repos
- [ ] `DELETE /api/repos/:id` — Remove repo from list and cleanup

## Phase 3: Analysis Engine
- [ ] Parse repository files (detect languages, frameworks)
- [ ] Extract API endpoints from backend code
- [ ] Extract API calls from frontend code
- [ ] Extract database schema definitions
- [ ] Compare and detect mismatches:
  - Frontend calls → missing backend endpoints
  - Backend endpoints → unused by frontend
  - Database fields → not used in backend
  - Backend models → missing in database schema

## Phase 4: Integration
- [ ] Generate code suggestions for missing features
- [ ] Create pull requests or patches
- [ ] Apply changes via GitHub API (with user approval)

## Phase 5: Additional Features
- [ ] `Generate` button — TBD (generate boilerplate? documentation?)
- [ ] `History` button — TBD (show past analyses? changelog?)
- [ ] `Reset` button — Clear all data and start fresh

## Future Ideas
- Support for GitLab, Bitbucket
- Real-time sync monitoring
- CI/CD integration
- Team collaboration features
