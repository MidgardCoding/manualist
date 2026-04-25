# TODO - Table of Contents Implementation

- [ ] Step 1: Create `src/utils/parseApiResponse.ts` utility to extract parsed sections from API response
- [ ] Step 2: Refactor `TextRenderer.tsx` to use the new `parseApiResponse` utility
- [ ] Step 3: Rewrite `TableOfContents.tsx` to accept `apiResponse`, parse it, and render collapsable items with Header as title, Subheader as content, and always show "Read More" button
- [ ] Step 4: Update `MainWorkflow.tsx` step `'render'` layout to show `TableOfContents` on the left and `JsonContentParser` on the right
- [ ] Step 5: Test and verify

