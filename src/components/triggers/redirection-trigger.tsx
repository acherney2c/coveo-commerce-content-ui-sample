import { useEffect, useState } from 'react';
import type {
  RedirectionTrigger as HeadlessRedirectionTrigger,
  RedirectionTriggerState,
} from '@coveo/headless/commerce';

interface IRedirectionTriggerProps {
  controller: HeadlessRedirectionTrigger;
}

export default function RedirectionTrigger(props: IRedirectionTriggerProps) {
  const { controller } = props;
  const [_state, setState] = useState<RedirectionTriggerState>(controller.state);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      const newState = controller.state;
      setState(newState);

      // Redirect to URL when provided in redirection trigger state.
      if (newState.redirectTo) {
        window.location.replace(newState.redirectTo);
      }
    });
    return () => unsubscribe();
  }, [controller]);

  // This component doesn't render anything visible
  return null;
}
