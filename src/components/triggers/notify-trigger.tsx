import { useEffect, useState } from 'react';
import type {
  NotifyTrigger as HeadlessNotifyTrigger,
  NotifyTriggerState,
} from '@coveo/headless/commerce';

interface INotifyTriggerProps {
  controller: HeadlessNotifyTrigger;
}

export default function NotifyTrigger(props: INotifyTriggerProps) {
  const { controller } = props;
  const [state, setState] = useState<NotifyTriggerState>(controller.state);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  if (!state.notifications || state.notifications.length === 0) {
    return null;
  }

  return (
    <>
      {state.notifications.map((notification, index) => (
        <div
          key={index}
          className="alert alert-primary d-flex align-items-center"
          role="alert"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="bi flex-shrink-0 me-2"
            width="24"
            height="24"
            viewBox="0 0 16 16"
            role="img"
            aria-label="Info:"
            fill="currentColor"
          >
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
          </svg>
          <p className="mb-0">{notification}</p>
        </div>
      ))}
    </>
  );
}
