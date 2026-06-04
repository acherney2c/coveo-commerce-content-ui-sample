import { useEffect, useMemo, type PropsWithChildren } from 'react';
import {
  buildInteractiveResult,
  type Result,
  type SearchEngine,
} from '@coveo/headless';

interface IContentResultLinkProps extends PropsWithChildren {
  searchEngine: SearchEngine;
  result: Result;
  className?: string;
}

export default function ContentResultLink(props: IContentResultLinkProps) {
  const { searchEngine, result, children, className } = props;

  const interactiveResult = useMemo(
    () => buildInteractiveResult(searchEngine, { options: { result } }),
    [searchEngine, result.uniqueId]
  );

  useEffect(() => () => interactiveResult.cancelPendingSelect(), [interactiveResult]);

  return (
    <a
      href={result.clickUri}
      target="_blank"
      rel="noreferrer noopener"
      className={className ?? 'list-group-item list-group-item-action'}
      onClick={() => interactiveResult.select()}
      onContextMenu={() => interactiveResult.select()}
      onMouseDown={() => interactiveResult.select()}
      onMouseUp={() => interactiveResult.select()}
      onTouchStart={() => interactiveResult.beginDelayedSelect()}
      onTouchEnd={() => interactiveResult.cancelPendingSelect()}
    >
      {children}
    </a>
  );
}
