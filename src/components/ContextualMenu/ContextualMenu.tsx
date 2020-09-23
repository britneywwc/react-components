import classNames from "classnames";
import PropTypes from "prop-types";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import usePortal from "react-useportal";
import uuidv4 from "uuid/v4";

import { useListener, usePrevious } from "../../hooks";
import ContextualMenuDropdown from "./ContextualMenuDropdown";
import Button from "../Button";
import type { MenuLink, Position } from "./ContextualMenuDropdown";

export type Props = {
  autoAdjust?: boolean;
  children?: ReactNode;
  className?: string;
  closeOnEsc?: boolean;
  closeOnOutsideClick?: boolean;
  constrainPanelWidth?: boolean;
  dropdownClassName?: string;
  hasToggleIcon?: boolean;
  links?: MenuLink[];
  onToggleMenu?: (isOpen: boolean) => void;
  position?: Position;
  positionNode?: HTMLElement;
  toggleAppearance?: string;
  toggleClassName?: string;
  toggleDisabled?: boolean;
  toggleLabel?: string;
  toggleLabelFirst?: boolean;
  visible?: boolean;
};
/**
 * Get the node to use for positioning the menu.
 * @param wrapper - The component's wrapping element.
 * @param positionNode - A positioning node, if supplied.
 * @return A node or null.
 */
const getPositionNode = (
  wrapper: HTMLElement,
  positionNode: HTMLElement
): HTMLElement | null => {
  if (positionNode) {
    return positionNode;
  } else if (wrapper) {
    // We want to position the menu in relation to the toggle, if it exists.
    const toggle = wrapper.querySelector<HTMLElement>(
      ".p-contextual-menu__toggle"
    );
    return toggle || wrapper;
  }
  return null;
};

/**
 * Whether the positioning node is visible.
 * @param positionNode - The node that is used to position the menu.
 * @return Whether the positioning node is visible.
 */
const getPositionNodeVisible = (positionNode: HTMLElement) => {
  return !positionNode || positionNode.offsetParent !== null;
};

/**
 * A component for the Vanilla contextual menu.
 * @param [autoAdjust=true] - Whether the menu should adjust to fit in the screen.
 * @param children - The menu content (if the links prop is not supplied).
 * @param className - An optional class to apply to the wrapping element.
 * @param [closeOnEsc=true] - Whether the menu should close when the escape key is pressed.
 * @param [closeOnOutsideClick=true] - Whether the menu should close when clicking outside the menu.
 * @param constrainPanelWidth - Whether the menu's width should match the toggle's width.
 * @param dropdownClassName - An optional class to apply to the dropdown.
 * @param hasToggleIcon - Whether the toggle should display a chevron icon.
 * @param links - A list of links to display in the menu (if the children prop is not supplied.)
 * @param onToggleMenu - A function to call when the menu is toggled.
 * @param [position="right"] - The position of the menu.
 * @param positionNode - An element to make the menu relative to.
 * @param toggleAppearance - The appearance of the toggle button.
 * @param toggleClassName - An class to apply to the toggle button.
 * @param toggleDisabled - Whether the toggle button should be disabled.
 * @param toggleLabel - The toggle button's label.
 * @param [toggleLabelFirst=true] - Whether the toggle lable or icon should appear first.
 * @param [visible=false] - Whether the menu should be visible.
 */
const ContextualMenu = ({
  autoAdjust = true,
  children,
  className,
  closeOnEsc = true,
  closeOnOutsideClick = true,
  constrainPanelWidth,
  dropdownClassName,
  hasToggleIcon,
  links,
  onToggleMenu,
  position = "right",
  positionNode,
  toggleAppearance,
  toggleClassName,
  toggleDisabled,
  toggleLabel,
  toggleLabelFirst = true,
  visible = false,
}: Props): JSX.Element => {
  const id = useRef(uuidv4());
  const wrapper = useRef();
  const [positionCoords, setPositionCoords] = useState<ClientRect>();
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const hasToggle = hasToggleIcon || toggleLabel;

  // Update the coordinates of the position node.
  const updatePositionCoords = useCallback(() => {
    const parent = getPositionNode(wrapper.current, positionNode);
    if (!parent) {
      return null;
    }
    setPositionCoords(parent.getBoundingClientRect());
  }, [wrapper, positionNode]);

  const { openPortal, closePortal, isOpen, Portal, ref } = usePortal({
    closeOnEsc,
    closeOnOutsideClick,
    isOpen: visible,
    onOpen: () => {
      // Call the toggle callback, if supplied.
      onToggleMenu && onToggleMenu(true);
      // When the menu opens then update the coordinates of the parent.
      updatePositionCoords();
    },
    onClose: () => {
      // Call the toggle callback, if supplied.
      onToggleMenu && onToggleMenu(false);
    },
  });
  const previousVisible = usePrevious(visible);
  const labelNode = toggleLabel ? <span>{toggleLabel}</span> : null;
  const wrapperClass = classNames(className, "p-contextual-menu", {
    [`p-contextual-menu--${adjustedPosition}`]: adjustedPosition !== "right",
  });

  // Update the coordinates of the wrapper once it mounts to the dom. This uses
  // The callback ref pattern:
  // https://reactjs.org/docs/hooks-faq.html#how-can-i-measure-a-dom-node
  const wrapperRef = useCallback(
    (node) => {
      wrapper.current = node;
      if (node !== null) {
        updatePositionCoords();
      }
    },
    [updatePositionCoords]
  );

  // Handle controlling updates to the menu visibility from outside
  // the component.
  useEffect(() => {
    if (visible !== previousVisible) {
      if (visible && !isOpen) {
        openPortal();
      } else if (!visible && isOpen) {
        closePortal();
      }
    }
  }, [closePortal, openPortal, visible, isOpen, previousVisible]);

  const onResize = useCallback(
    (evt) => {
      const parent = getPositionNode(wrapper.current, positionNode);
      if (parent && !getPositionNodeVisible(parent)) {
        // Hide the menu if the item has become hidden. This might happen in
        // a responsive table when columns become hidden as the page
        // becomes smaller.
        closePortal(evt);
      } else {
        // Update the coordinates so that the menu stays relative to the
        // toggle button.
        updatePositionCoords();
      }
    },
    [closePortal, positionNode, updatePositionCoords]
  );

  useListener(window, onResize, "resize", true, isOpen);

  return (
    <span
      className={wrapperClass}
      ref={wrapperRef}
      style={
        positionNode
          ? null
          : {
              position: "relative",
            }
      }
    >
      {hasToggle ? (
        <Button
          appearance={toggleAppearance}
          aria-controls={id.current}
          aria-expanded={isOpen ? "true" : "false"}
          aria-haspopup="true"
          className={classNames("p-contextual-menu__toggle", toggleClassName)}
          disabled={toggleDisabled}
          hasIcon={hasToggleIcon}
          onClick={(evt: React.MouseEvent) => {
            if (!isOpen) {
              openPortal(evt);
            } else {
              closePortal(evt);
            }
          }}
        >
          {toggleLabelFirst ? labelNode : null}
          {hasToggleIcon ? (
            <i
              className={classNames(
                "p-icon--contextual-menu p-contextual-menu__indicator",
                {
                  "is-light": ["negative", "positive"].includes(
                    toggleAppearance
                  ),
                }
              )}
            ></i>
          ) : null}
          {toggleLabelFirst ? null : labelNode}
        </Button>
      ) : (
        <>
          {/* Give the portal a ref to get around an event issue. https://github.com/alex-cory/react-useportal/issues/36 */}
          <span style={{ display: "none" }} ref={ref} />
        </>
      )}
      {isOpen && (
        <Portal>
          <ContextualMenuDropdown
            adjustedPosition={adjustedPosition}
            autoAdjust={autoAdjust}
            closePortal={closePortal}
            constrainPanelWidth={constrainPanelWidth}
            dropdownClassName={dropdownClassName}
            dropdownContent={children}
            id={id.current}
            isOpen={isOpen}
            links={links}
            position={position}
            positionCoords={positionCoords}
            positionNode={getPositionNode(wrapper.current, positionNode)}
            setAdjustedPosition={setAdjustedPosition}
            wrapperClass={wrapperClass}
          />
        </Portal>
      )}
    </span>
  );
};

ContextualMenu.propTypes = {
  /**
   * Whether the menu should adjust to fit in the screen.
   */
  autoAdjust: PropTypes.bool,
  /**
   * The menu content (if the links prop is not supplied).
   */
  children: PropTypes.node,
  /**
   * An optional class to apply to the wrapping element.
   */
  className: PropTypes.string,
  /**
   * Whether the menu should close when the escape key is pressed.
   */
  closeOnEsc: PropTypes.bool,
  /**
   * Whether the menu should close when clicking outside the menu.
   */
  closeOnOutsideClick: PropTypes.bool,
  /**
   * Whether the menu's width should match the toggle's width.
   */
  constrainPanelWidth: PropTypes.bool,
  /**
   * An optional class to apply to the dropdown.
   */
  dropdownClassName: PropTypes.string,
  /**
   * Whether the toggle should display a chevron icon.
   */
  hasToggleIcon: PropTypes.bool,
  /**
   * A list of links to display in the menu (if the children prop is not supplied.)
   */
  links: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape(Button.propTypes),
      PropTypes.arrayOf(PropTypes.shape(Button.propTypes)),
    ])
  ),
  /**
   * A function to call when the menu is toggled.
   */
  onToggleMenu: PropTypes.func,
  /**
   * An element to make the menu relative to.
   */
  positionNode: PropTypes.object,
  /**
   * The position of the menu.
   */
  position: PropTypes.oneOf(["left", "center", "right"]),
  /**
   * The appearance of the toggle button.
   */
  toggleAppearance: PropTypes.string,
  /**
   * An class to apply to the toggle button.
   */
  toggleClassName: PropTypes.string,
  /**
   * Whether the toggle button should be disabled.
   */
  toggleDisabled: PropTypes.bool,
  /**
   * The toggle button's label.
   */
  toggleLabel: PropTypes.string,
  /**
   * Whether the toggle lable or icon should appear first.
   */
  toggleLabelFirst: PropTypes.bool,
  /**
   * Whether the menu should be visible.
   */
  visible: PropTypes.bool,
};

export default ContextualMenu;
