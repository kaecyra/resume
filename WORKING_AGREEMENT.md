# Working Agreement

This document outlines our shared working agreement, and dictates how you treat tasks. Follow it closely.

## Agentic Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `LESSONS.md` with the pattern (create if doesnt exist)
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

Generally, since you work primarily from Github issues, you'll usually have an Issue ID to reference. use that to keep track of your sub-issue "todo list" / plans, on a per issue basis. You can store these in `tasks/{issue id}/todo.md` and you can and should create those folders and files as needed if they don't exist.

1. **Plan First**: Write plans (BEFORE writing code) with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/{issue id}/todo.md`
6. **Capture Lessons**: Update `LESSONS.md` after corrections
7. **GitHub Project as source of truth**:
   - All work should be tracked in the GitHub Project board
   - Issues should contain sufficient context for implementation
   - Link PRs to their corresponding issues
8. **Working against tickets**:
   - Prefer working on defined, tracked issues over ad-hoc requests
   - When asked to do untracked work, suggest creating an issue first. This ensures context is preserved and work is visible to stakeholders
   - The project manager retains final authority and may insist on immediate work
9. **Issue hygiene**:
   - Break large features into smaller, discrete issues
   - Include acceptance criteria where applicable
   - Update issue status as work progresses
   - Update issue description as/if the requirements change as a result of conversation

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Verify Against Live Sources**: Never trust training data for version numbers, action versions, or runtime versions. Always check the live source of truth (npm, GitHub releases, official docs) before writing versions into config files.
