# User Flows

## Public Visitor
1. User lands on `/`.
2. User selects CTA and navigates to `/auth`.

## Authentication
1. User signs in or signs up on `/auth`.
2. On success, user is routed to `/app`.
3. Password reset is initiated from `/auth` and completed via recovery link.

## Authenticated Workspace
1. User accesses `/app`.
2. User can sign out and return to public/auth routes.
