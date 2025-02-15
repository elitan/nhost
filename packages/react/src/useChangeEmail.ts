import { useCallback, useMemo } from 'react'

import {
  ChangeEmailHandlerResult,
  ChangeEmailOptions,
  changeEmailPromise,
  ChangeEmailState,
  createChangeEmailMachine
} from '@nhost/core'
import { useInterpret, useSelector } from '@xstate/react'

import { useNhostClient } from './useNhostClient'

interface ChangeEmailHandler {
  (email: string, options?: ChangeEmailOptions): Promise<ChangeEmailHandlerResult>
  /** @deprecated */
  (email?: unknown, options?: ChangeEmailOptions): Promise<ChangeEmailHandlerResult>
}

export interface ChangeEmailHookResult extends ChangeEmailState {
  /** Requests the email change. Returns a promise with the current context  */
  changeEmail: ChangeEmailHandler
}

/**
 * Use the hook `useChangeEmail` to change email for the user.
 *
 * @example
 * ```tsx
 * const { changeEmail, isLoading, needsEmailVerification, isError, error } = useChangeEmail();
 *
 * console.log({ isLoading, needsEmailVerification, isError, error });
 *
 * const handleFormSubmit = async (e) => {
 *   e.preventDefault();
 *
 *   await changeEmail({
 *     email: 'new@example.com',
 *   })
 * }
 * ```
 *
 * @docs https://docs.nhost.io/reference/react/use-change-email
 */
export function useChangeEmail(options?: ChangeEmailOptions): ChangeEmailHookResult

/**
 * @deprecated
 */
export function useChangeEmail(email?: string, options?: ChangeEmailOptions): ChangeEmailHookResult

export function useChangeEmail(a?: string | ChangeEmailOptions, b?: ChangeEmailOptions) {
  const stateEmail = useMemo(() => (typeof a === 'string' ? a : undefined), [a])
  const stateOptions = useMemo(() => (typeof a !== 'string' ? a : b), [a, b])
  const nhost = useNhostClient()
  const machine = useMemo(() => createChangeEmailMachine(nhost.auth.client), [nhost])

  const service = useInterpret(machine)

  const isLoading = useSelector(service, (s) => s.matches('requesting'))
  const error = useSelector(service, (state) => state.context.error)
  const isError = useSelector(service, (state) => state.matches('idle.error'))
  const needsEmailVerification = useSelector(service, (state) => state.matches('idle.success'))

  const changeEmail: ChangeEmailHandler = useCallback(
    async (valueEmail?: string | unknown, valueOptions = stateOptions) =>
      changeEmailPromise(
        service,
        typeof valueEmail === 'string' ? valueEmail : (stateEmail as string),
        valueOptions
      ),
    [service, stateEmail, stateOptions]
  )

  return { changeEmail, isLoading, needsEmailVerification, isError, error }
}
