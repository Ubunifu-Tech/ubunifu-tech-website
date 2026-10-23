'use client';

import { MenuItem, MenuLink, MenuList, RowMenu } from '@/components/console/RowMenu';
import { startPost } from './posts/actions';
import styles from './Admin.module.css';

/**
 * Starting something from anywhere, in the top band. Only what this person's
 * role can start is offered.
 */
export function NewMenu({
  payment,
  project,
  client,
  post,
}: {
  payment: boolean;
  project: boolean;
  client: boolean;
  post: boolean;
}) {
  if (!payment && !project && !client && !post) return null;
  return (
    <RowMenu label="New" text="New" triggerClassName={styles.newTrigger}>
      <MenuList>
        {payment && <MenuLink href="/payments/new">Record a payment</MenuLink>}
        {project && <MenuLink href="/projects/new">Start a project</MenuLink>}
        {client && <MenuLink href="/clients/new">Add a client</MenuLink>}
        {post && (
          <form action={startPost}>
            <MenuItem type="submit">Write a post</MenuItem>
          </form>
        )}
      </MenuList>
    </RowMenu>
  );
}
