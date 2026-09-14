import Image, { type ImageProps } from 'next/image';
import { getProjectDiagram } from '@/content/project-visuals';
import { SystemDiagram } from './SystemDiagram';
import { getStoryVisual, StoryVisual } from './StoryVisual';

/** Preserve raster covers for ordinary articles; use real diagrams for client work. */
export function EditorialVisual(props: ImageProps) {
  const diagram = getProjectDiagram(props.src);
  if (diagram) {
    return (
      <SystemDiagram
        kind={diagram.kind}
        description={props.alt ? diagram.description : undefined}
        className={props.className}
        project
      />
    );
  }

  const story = getStoryVisual(props.src);
  if (story) {
    return (
      <StoryVisual
        kind={story.kind}
        description={story.description}
        className={props.className}
      />
    );
  }

  return <Image {...props} alt={props.alt} />;
}
