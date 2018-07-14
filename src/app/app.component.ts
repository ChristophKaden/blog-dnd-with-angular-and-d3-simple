import { Component, OnInit, ElementRef } from '@angular/core';

// import d3-js methods, type definitions will be imported automatically
import * as d3 from 'd3';

/**
 * defines our drag item
 */
interface Item {
  /** caption for item */
  text: string;
  /** background color for item */
  color: string;
  /** left position (px) */
  left: number;
  /** top position (px) */
  top: number;
  /** if false, item will be hidden by visibility:hidden */
  visible?: boolean;
};

/**
 * defines styles for our drag item, declare all styles here which should be transformed in animation
 */
interface DragItemStyle {
  /** left position (px) */
  left: number;
  /** top position (px) */
  top: number;
  /** width (px) */
  width: number;
  /** height (px) */
  height: number;
  /** line height for vertical center text (px) */
  lineHeight: number;
  /** border radius (%) */
  borderRadius: number;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  /** contains all items, which can be dragged */
  public draggable: Item[] = [];
  /** conaints all items, which were dropped */
  public dropped: Item[] = [];
  /** if assigned, the currently dragged item */
  public dragging: Item;
  /** style for the currently dragged item, needed to definie our animations */
  public dragItemStyle: DragItemStyle;
  /** mouse offset (px), defines the mouse position within our item when drag starts */
  public mouseOffset = { x: 0, y: 0 };

  /**
   * constructor, needed to get the reference to our html elements
   * @param element 
   */
  constructor(
    private element: ElementRef
  ){}

  /**
   * initialization, needed to definie our drag items
   */
  ngOnInit() {
    this.draggable = [
      { text: 'Item 1', color: 'red', left: 100, top: 100 },
      { text: 'Item 2', color: 'green', left: 200, top: 100 },
      { text: 'Item 3', color: 'yellow', left: 300, top: 100 }
    ]
  };

  /**
   * This event is triggered, when the user starts dragging an item.
   * @param event browser drag event
   * @param item dragged item
   */
  public dragStart(event: DragEvent, item: Item){
    // make sure, that an other animation has finished yet
    if(this.dragging){ return false; }
    // define our transfer data for d'n'd, needed for firefox
    event.dataTransfer.setData('text', item.text);
    // define our transfer operation (move, copy, link,...), needed for internet explorer
    event.dataTransfer.effectAllowed = 'move';
    // set reference to drag item
    this.dragging = item;
    // if setDragImage method is defined (needed for chrome)
    if(event.dataTransfer.setDragImage){
      // get reference to our "visible" dummy html element
      const dragDummy = 
        (this.element.nativeElement as Element).querySelector('.drag-dummy');
      // define this dummy element as ghost for drag operation
      event.dataTransfer.setDragImage(dragDummy, 0, 0);
      // to hide the original element, wait a tick to make sure chrome doesn't break the d'n'd operation
      setTimeout( () => { item.visible = false; }, 0);
    }
    // internet explorer doesn't know anything about the setDragImage method
    else {
      // but we can hide it when drag starts to hide the ghost and our original element
      item.visible = false;
    }
    // use the style definition of our current element to definie start style for the drag ghost element
    // important! This definition must match the css rules for .draggable-item
    this.dragItemStyle = {
      left: item.left,
      top: item.top,
      width: 80,
      height: 80,
      lineHeight: 80,
      borderRadius: 50
    };
    // calculate the mouse offset within our item, needed to avoid jumping ghost
    this.mouseOffset.x = event.pageX - item.left;
    this.mouseOffset.y = event.pageY - item.top;
  };

  /**
   * This event is triggered, when user cancels the drag operation.
   * @param event browser drag event
   * @param item dragged item
   */
  public dragEnd(event: DragEvent, item: Item){
    // for the animation, at first select our original element to use the d3.js methods
    d3.select(event.target as Element)
      // define our animation
      .transition()
      // with an duration of 500ms
      .duration(500)
      // use the tween method to hook the animation steps and to use Angulars rendering engine
      .attrTween('animate', () => {
        // define the interpolation functions, use the currently position for the start 
        // and the original position for the end
        const i = {
          left: d3.interpolate(this.dragItemStyle.left, this.dragging.left),
          top: d3.interpolate(this.dragItemStyle.top, this.dragging.top)
        };
        // return the factory function, which will be executed permanently during our animation
        return (t: number): string => {
          // calculate the current position for the animation step by executing the interpolation
          // function with the animation progress (t -> 0-1)
          this.dragItemStyle.left = i.left(t);
          this.dragItemStyle.top = i.top(t);
          // return an empty string, because a html attribute is always a string and the
          // d3 types definition force us to return a value.
          return '';
        }
      })
      // when animation has finished and was not interrupted
      .on('end', () => {
        // show our item again
        item.visible = true;
        // remove drag reference to allow new drag operations
        this.dragging = undefined;
      });
  };

  /**
   * This event is triggered permanently, while the user moves the drag element over our 
   * landing zone.
   * @param event browser drag event
   */
  public dragOver(event: DragEvent){
    // make sure, the user has started the drag operation with one of our elements
    if(this.dragging){
      // prevent the default browser behaviour to allow the drop here
      event.preventDefault();
    }
  };

  /**
   * This event is triggered, when user drops the element at our landing zone.
   * @param event browser drag event
   */
  public drop(event: DragEvent){
    // first prevent the default browser behaviour, it's neccessary because of the
    // firefox - it will interprets the text as an url and navigates to our "text".
    event.preventDefault();
    // calculate the index of our drag item in the items array
    const index = this.draggable.indexOf(this.dragging);
    // just remove it there to hide it
    this.draggable.splice(index, 1);
    // append the drag item to the dropped array to "show" it there
    this.dropped.push(this.dragging);
    // calculate the new index in the dropped array
    const droppedIndex = this.dropped.length - 1;
    // select our original element for animation definition
    d3.select(event.target as Element)
      // define our animation
      .transition()
      // with an duration of 1000ms
      .duration(1000)
      // use the tween method to hook the animation steps and to use Angulars rendering engine
      .attrTween('animate', () => {
        // for the calculation of the end position and dimension, reference the target item from dropped zone
        const target = (this.element.nativeElement as HTMLElement).querySelectorAll('.dropped-item')[droppedIndex];
        // calculate the box rectangle for it
        const box = target.getBoundingClientRect();
        // define the interpolation functions, use the currently position for the start 
        // and the box infos for the end. We should add every style difference between our ghost
        // and the end element here too.
        const i = {
          left: d3.interpolate(this.dragItemStyle.left, box.left),
          top: d3.interpolate(this.dragItemStyle.top, box.top),
          width: d3.interpolate(this.dragItemStyle.width, box.right - box.left),
          height: d3.interpolate(this.dragItemStyle.height, box.bottom - box.top),
          lineHeight: d3.interpolate(this.dragItemStyle.lineHeight, 20),
          borderRadius: d3.interpolate(this.dragItemStyle.borderRadius, 0)
        };
        // return the factory function, which will be executed permanently during our animation
        return (t: number): string => {
          // calculate the current styles for the animation step by executing the interpolation
          // function with the animation progress (t -> 0-1)
          this.dragItemStyle.left = i.left(t);
          this.dragItemStyle.top = i.top(t);
          this.dragItemStyle.width = i.width(t);
          this.dragItemStyle.height = i.height(t);
          this.dragItemStyle.lineHeight = i.lineHeight(t);
          this.dragItemStyle.borderRadius = i.borderRadius(t);
          // return an empty string, because a html attribute is always a string and the
          // d3 types definition force us to return a value.
          return '';
        };
      })
      // when animation has finished and was not interrupted
      .on('end', () => {
        // show our item, here it's the end item
        this.dragging.visible = true;
        // remove drag reference to allow new drag operations
        this.dragging = undefined;
      });
  };

  /**
   * This event is triggered permanently, while the user moves our drag element 
   * within the drag container. It's necessary to adjust our ghost at the mouse cursor.
   * @param event 
   */
  public moveDragElement(event: DragEvent){
    // make sure, the drag operation was started with one of our elements
    if(this.dragging){
      // calculate the currently position for the ghost by using the mouse position
      // and the previously calculated mouse offset.
      this.dragItemStyle.left = event.pageX - this.mouseOffset.x;
      this.dragItemStyle.top = event.pageY - this.mouseOffset.y;
    }
  };

}