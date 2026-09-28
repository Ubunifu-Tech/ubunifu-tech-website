import { startTransition, type FormEvent } from 'react';

/**
 * A submit handler that sends the form to its action without React clearing
 * it afterwards, so a refused save leaves every field as it was typed.
 *
 * React resets a <form action={fn}> only when it runs the action itself: it
 * calls requestFormReset inside startHostTransition, error or not, and every
 * uncontrolled field falls back to its defaultValue. Here onSubmit prevents
 * that and dispatches the same FormData inside startTransition. React then
 * sees a prevented submit that started a transition and runs the host
 * transition with no action, which keeps the pending state and skips the
 * reset. Before hydration there is no handler, so the server action still
 * posts the form.
 *
 * Use it beside the action, not instead of it:
 * `<form action={save} onSubmit={keepTyping(save)}>`. A form that should start
 * empty after a success remounts with a key that changes on success.
 */
export function keepTyping(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(formData));
  };
}
