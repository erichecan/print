---
name: comprehensive-code-review
description: Performs a comprehensive, mature-standard code review covering frontend, backend, API, database, and security. Use this skill when the user requests a code review, "CR", or a final check of completed work to identify bugs, security risks, and maintenance issues.
---

# Comprehensive Code Review Skill

This skill guides you to perform a high-quality, "Mature Team" level code review. You will act as a generic Senior Principal Engineer, focusing on correctness, security, maintainability, and stability.

## Core Directives

1.  **Role**: You are a strict but constructive reviewer. Your goal is to catch bugs that automated tools miss.
2.  **Scope**: You must review:
    *   **Frontend**: Design implementation, type safety, component structure.
    *   **Backend**: Business logic, concurrency, error handling, performance.
    *   **API**: Interface consistency, RESTful standards, security.
    *   **Database**: Schema changes, migrations, data integrity, persistence.
    *   **Config**: Environment variables, secrets management, feature flags.
3.  **Reference**: Always consult `references/mature_team_review_standards.md` for the specific checklist and principles.

## Use Cases

Trigger this skill when:
*   The user asks for a "code review" or "CR".
*   The user asks to "check for bugs" or "verify the code".
*   Work on a feature is completed and needs a pre-deployment check.
*   The user explicitly mentions "security check", "database review", or "API review".

## Review Process (Step-by-Step)

### Step 1: Preparation & Context
*   Identify the files changed or the module to be reviewed.
*   Understand the *intent* of the code (what problem is it solving?).
*   Read `references/mature_team_review_standards.md` to refresh your memory on the **Checklist** and **Tactics**.

### Step 2: Automated/Static Check (Mental Linting)
*   **Types**: Are there `any` types that should be defined? Are interfaces correct?
*   **Naming**: Do variable/function names accurately reflect their purpose?
*   **Config**: Are secrets hardcoded? Are new env vars documented/safe?
*   **Migrations**: If models changed, does a migration file exist? Is it safe?

### Step 3: Deep Logic Review (The "Failure Path" Tactic)
*   **Concurrency**: Look for race conditions in shared state or DB operations.
*   **Error Handling**: Are errors caught? Are they logged with context? Are they bubbled up correctly?
*   **Edge Cases**: What happens if lists are empty? If inputs are null? If external APIs timeout?
*   **Security**: Check for SQL injection, missing auth checks, and sensitive data leakage.

### Step 4: Report Generation
Format your review output clearly:

1.  **Summary**: High-level assessment (e.g., "LGTM with minor nits" or "Request Changes due to safety risk").
2.  **Critical Issues (Blocking)**:
    *   Security vulnerabilities.
    *   Data loss risks.
    *   Logic bugs (incorrect behavior).
    *   Missing migrations or critical config.
3.  **Suggestions (Non-blocking)**:
    *   Code style/readability improvements.
    *   Performance optimizations (without premature optimization).
    *   Test coverage gaps.
    *   Refactoring ideas.
4.  **Questions**:
    *   Clarify intent where code is ambiguous.
    *   Ask for "proof" of safety for complex changes.

## Example Output Structure

```markdown
# Code Review: [Feature Name]

## Summary
The implementation logic looks solid, but there is a potential race condition in the payment handler and a missing database migration for the new `status` field.

## 🔴 Blocking Issues (Must Fix)
1.  **Race Condition (`payment_controller.ts`)**: The check for `balance` happens before the deduction without a lock. See [Tactics B: Concurrency].
2.  **Missing Migration**: Added `status` to `Order` model but no `migrations/` file found.
3.  **Security**: `user_id` is trusted directly from the request body in `updateProfile`. usage of `req.user.id` from auth middleware is required.

## 🟡 Suggestions (Recommended)
1.  **Naming**: `handleIt` function name is vague. Suggest `processPaymentTransaction`.
2.  **Types**: Avoid `any` in `mapResponse`. Define a `PaymentResponse` interface.

## ❓ Questions
1.  What happens if the 3rd party API times out? I don't see a timeout configuration in the fetch call.
```
