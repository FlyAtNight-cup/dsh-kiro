/**
 * The Kiro client identity every request presents.
 *
 * Kiro gates clients by the version embedded in `user-agent`: since
 * 2026-11-09 it refuses IDE builds older than 0.11.133 and CLI builds older
 * than 1.28.2 with "This version of Kiro is no longer supported. Please
 * update to the latest version of Kiro to continue." The gate reads the
 * `KiroIDE-<version>` token, so the fix for a raised floor is to bump
 * {@link KIRO_IDE_VERSION} here — all request paths share it.
 *
 * 1.4.121 is the current Kiro IDE release and passes on both the Amazon Q
 * (`q.*.amazonaws.com`) and branded (`runtime.*.kiro.dev`) hosts.
 *
 * @module dsh-kiro/client-identity
 */
/** Kiro IDE release presented to the service; must stay above Kiro's floor. */
export declare const KIRO_IDE_VERSION = "1.4.121";
/** `user-agent` / `x-amz-user-agent` value naming that Kiro IDE release. */
export declare const KIRO_USER_AGENT = "aws-sdk-js/1.0.0 KiroIDE-1.4.121";
