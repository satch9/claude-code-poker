import React from "react";
import { Drawer } from "../UI/Drawer";
import { ActionFeed } from "./ActionFeed";

interface ActionFeedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  actions: any[];
}

export const ActionFeedDrawer: React.FC<ActionFeedDrawerProps> = ({
  isOpen,
  onClose,
  actions,
}) => (
  <Drawer isOpen={isOpen} onClose={onClose} title="Actions récentes">
    <ActionFeed actions={actions} />
  </Drawer>
);
