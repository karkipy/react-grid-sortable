import {
    cloneNode,
    events,
    getScrollingParent,
    getContainerGridGap,
    getEdgeOffset,
    getElementMargin,
    getPosition,
    setInlineStyles,
    setTranslate3d,
} from '../utils';

import { defaultGetHelperDimensions } from './defaultGetHelperDimensions';

export const nodeIsChild = (node, parent) => node.sortableInfo.manager === parent;

export function isSortableHandle(node) {
    return node.sortableHandle != null;
}

export class SortableContainerManager {
    constructor(manager, event, container, props) {
        this.manager = manager;
        this.event = event;
        this.container = container;
        this.props = props;
        this.scrollContainer = getScrollingParent(this.container) || this.container;
        this.document = this.container.ownerDocument || document;
        const contentWindow = this.document.defaultView || window;
        this.contentWindow = typeof contentWindow === 'function' ? contentWindow() : contentWindow;
    }

    handleSortMove = (event) => {
        const { onSortMove } = this.props;

        this.updateHelperPosition(event);
        this.animateNodes();
        if (typeof event.preventDefault === 'function' && event.cancelable) {
            event.preventDefault();
        }

        if (onSortMove) {
            onSortMove(event);
        }
    };

    updateHelperPosition(event) {
        const offset = getPosition(event);
        const translate = {
            x: offset.x - this.initialOffset.x,
            y: offset.y - this.initialOffset.y,
        };

        // Adjust for window scroll
        translate.y -= window.pageYOffset - this.initialWindowScroll.top;
        translate.x -= window.pageXOffset - this.initialWindowScroll.left;

        this.translate = translate;
        setTranslate3d(this.helper, translate);
    }

    animateNodes() {
        const { hideSortableGhost = true, onSortOver } = this.props;
        const nodes = this.manager.getOrderedRefs();
        const sortingOffset = {
            left:
          this.offsetEdge.left + this.translate.x,
            top: this.offsetEdge.top + this.translate.y,
        };

        const prevIndex = this.newIndex;
        this.newIndex = null;

        for (let i = 0, len = nodes.length; i < len; i += 1) {
            const { node } = nodes[i];
            const { index } = node.sortableInfo;
            const height = node.offsetHeight;
            let { edgeOffset } = nodes[i];

            // If we haven't cached the node's offsetTop / offsetLeft value
            if (!edgeOffset) {
                edgeOffset = getEdgeOffset(node, this.container);
                nodes[i].edgeOffset = edgeOffset;
            }

            // If the node is the one we're currently animating, skip it
            if (index === this.index) {
                if (hideSortableGhost) {
                    /*
             * With windowing libraries such as `react-virtualized`, the sortableGhost
             * node may change while scrolling down and then back up (or vice-versa),
             * so we need to update the reference to the new node just to be safe.
             */
                    this.sortableGhost = node;
                    setInlineStyles(node, {
                        opacity: 0,
                        visibility: 'hidden',
                    });
                }
                continue;
            }

            const elementIndex = index;
            const draggingElementIndex = this.index;

            const firstCheck = elementIndex < draggingElementIndex
            && ((sortingOffset.left <= edgeOffset.left
              && sortingOffset.top - height / 2
                <= edgeOffset.top)
              || sortingOffset.top + height / 2
                <= edgeOffset.top);

            const secondCheck = elementIndex > draggingElementIndex
            && ((sortingOffset.left >= edgeOffset.left
              && sortingOffset.top
                >= edgeOffset.top - height / 2)
              || sortingOffset.top
                >= edgeOffset.top + height / 2);
                // Calculations for a grid setup

            if (firstCheck) {
                // If the current node is to the left on the same row, or above the node that's being dragged
                // then move it to the right
                if (this.newIndex === null) {
                    this.newIndex = index;
                }
            } else if (secondCheck) {
                // If the current node is to the right on the same row, or below the node that's being dragged
                // then move it to the left
                this.newIndex = index;
            }
        }

        if (this.newIndex == null) {
            this.newIndex = this.index;
        }

        const oldIndex = prevIndex;

        if (onSortOver && this.newIndex !== oldIndex) {
            onSortOver({
                collection: this.manager.active.collection,
                index: this.index,
                newIndex: this.newIndex,
                oldIndex,
                nodes,
                helper: this.helper,
            });
        }
    }

    handleSortEnd = (event) => {
        const { onSortEnd } = this.props;

        const {
            active: { collection },
        } = this.manager;
        const nodes = this.manager.getOrderedRefs();

        // Remove the event listeners if the node is still in the DOM
        if (this.listenerNode) {
            events.move.forEach((eventName) => this.listenerNode.removeEventListener(
                eventName,
                this.handleSortMove,
            ));
            events.end.forEach((eventName) => this.listenerNode.removeEventListener(
                eventName,
                this.handleSortEnd,
            ));
        }

        // Remove the helper from the DOM
        this.helper.parentNode.removeChild(this.helper);

        if (this.sortableGhost) {
            setInlineStyles(this.sortableGhost, {
                opacity: 1,
                visibility: 'visible',
            });
        }

        for (let i = 0, len = nodes.length; i < len; i += 1) {
            const node = nodes[i];

            // Clear the cached offset/boundingClientRect
            node.edgeOffset = null;
            node.boundingClientRect = null;
            node.translate = null;
        }

        // Update manager state
        this.manager.active = null;
        if (typeof onSortEnd === 'function') {
            onSortEnd(
                {
                    collection,
                    newIndex: this.newIndex,
                    oldIndex: this.index,
                    nodes,
                },
                event,
            );
        }
    }

    handlePress = (event) => {
        const active = this.manager.getActive();

        if (active) {
            const { node, collection } = active;
            const { index } = node.sortableInfo;
            const margin = getElementMargin(node);
            const gridGap = getContainerGridGap(this.container);
            const dimensions = defaultGetHelperDimensions({ index, node, collection });

            const {
                onSortStart,
            } = this.props;
            this.node = node;
            this.margin = margin;
            this.gridGap = gridGap;
            this.width = dimensions.width;
            this.height = dimensions.height;
            this.marginOffset = {
                x: this.margin.left + this.margin.right + this.gridGap.x,
                y: Math.max(this.margin.top, this.margin.bottom, this.gridGap.y),
            };
            this.boundingClientRect = node.getBoundingClientRect();
            this.index = index;
            this.newIndex = index;
            this.offsetEdge = getEdgeOffset(node, this.container);
            this.initialOffset = getPosition(event);
            this.initialScroll = {
                left: this.scrollContainer.scrollLeft,
                top: this.scrollContainer.scrollTop,
            };

            this.initialWindowScroll = {
                left: window.pageXOffset,
                top: window.pageYOffset,
            };

            this.helper = this.document.body.appendChild(cloneNode(node));

            setInlineStyles(this.helper, {
                boxSizing: 'border-box',
                height: `${this.height}px`,
                left: `${this.boundingClientRect.left - margin.left}px`,
                pointerEvents: 'none',
                position: 'fixed',
                top: `${this.boundingClientRect.top - margin.top}px`,
                width: `${this.width}px`,
            });

            this.sortableGhost = node;

            setInlineStyles(node, {
                opacity: 0,
                visibility: 'hidden',
            });

            this.listenerNode = this.contentWindow;
            events.move.forEach((eventName) => this.listenerNode.addEventListener(
                eventName,
                this.handleSortMove,
                false,
            ));
            events.end.forEach((eventName) => this.listenerNode.addEventListener(
                eventName,
                this.handleSortEnd,
                false,
            ));

            if (onSortStart) {
                onSortStart(
                    {
                        node,
                        index,
                        collection,
                        nodes: this.manager.getOrderedRefs(),
                        helper: this.helper,
                    },
                    event,
                );
            }
        }
    }

    static create(manager, event, container, props) {
        return new SortableContainerManager(manager, event, container, props);
    }
}
