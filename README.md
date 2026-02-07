# 🗺️ Project Roadmap: K9 Course Builder
This is my one-true-copy of the project roadmap.

## Controls Uniformity Punch List

### OBJECT EDITS
- Selecting a hide should highlight it in blue.
- Selecting a bale should show the rotate handle (easy) and the transform handles (harder, will have to update store to store individual dimensions)
- Selecting the start box should highlight it in blue before you start to drag it. 

### KEYBOARD SHORTCUTS (General)
- Implement R for Rotate in 15 degree intervals. Shift+R to rotate in 45 degree intervals.
- Implement E for Transform
- Implement V for llSelect
- Implement U for Cycle Hide Elevation
- Implement Y for Cycle Hide Type
- Implement O for Cycle Orientation
- Implement L for Cycle Lean

- Implement 
- Make sure we can Tab around objects. 
- Confirm Bcksp/Del delete all objects
- Confirm CTRL+A for select all.
- Alt + Drag to duplicate object/selection
- Arrows to nudge placement
- Make sure all objects are transformable

### TOOL SELECT SHORTCUTS
- B for Bale
- H for Hide
- G for Gate
- D for DC Mat
- S for Start Box
- T for Step
- Q for Board Line
- W for Board Box
- Z for Dead Zone
- X for Obstruction
- M for Measure
- N for Note

Make sure that users can turn off keyboard tools, and that keyboard tools only fire when they're in the program actively. 

## RC MENUS

All Menus should have delete, rotate, customize... (modal to edit colors, dimensions, text)

### BALES
- Lean
- Orientation
- Anchor

### HIDES (already built, just need to add delete/rotate/customize)
- Type:
    Rat
    Litter
    Empty
- Number:
    1-8
    Clear
- Blind number picker (implement later)

### ZONES
 - Type:
    Dead Zone
    Obstruction


## Edits Starting 2/2
 - (DONE) Bales placed close an edge will bleed over until they're moved and snapped back to the course
 - (DONE) If you try to place a board edge on a bale, it selects the bale instead / doesn't do the board edge
 - (DONE) If you try to place a rat marker on top of a bale, it defaults to the top left corner


## Requested Edits
 - (DONE) Bales are still having weird spacing issues. Maybe thicker lines to hide them? "Below is a screenshot of the bales flush. I hit the button you said and it seemed to align the two sides but not the top which I have circled and also the other circled one if I try to move the bale it overlaps."
 - (DONE) Give option to print landscape OR portrait (this went away with the last print modal update)
 - (DONE) Give option to print transparent multiple layers, "Is there a way to print with all the levels Opaque for the judges maps with the hides?"
 - (DONE) Adjustable step size instead of the standard hardcoded version
 - (DONE) More bale placement issues, "some instances where I can't make the bale flush against a wall without it seem like it's overlapping"
 - (DONE) Show grayed out upper levels when working on lower levels in map editor (show/hide checkbox maybe?)


## End of Month Update
 - (DONE) Create Print Settings module instead of multiple print buttons
 - (DONE) Persist measurements when file reopens
 - (DONE) Persist comparison map when file reopens
 - (DONE) Getting additional features on the context menu

## Mid Month Update
 - Added help button with description of different keyboard shortcuts and button functions
 - Fixed measurement tool saves, math, and display
 - Fixed step display sizing issue
 - Remove Anchor button from contextmenu if selected item is not a bale
 - Revised instructions for blank judge name
 - Fortified judge sponsorship and saves
 - Fixed map placement issue where saves would move objects around upon reopening
 - Fixed map alignment issue; added rescue button under "More Actions": "Realign All To Grid"
 - Adding expanded folder capabilities.
 - Adjusting 1-ft grid for printing
 - Renaming sidebar items for clarity

 

## Feature Requests & Future Updates (Long Term)
 - Offline caching, offline version, local storage options (very long term)
 - Validation for class level guidelines
 - Area measurement tool (for distance challenge calculation)
 - Public library access for repeatable structures
 - Add a variety of SENIOR and MASTER tunnels to Tunnel Library.
 - Premade tunnels should indicate EastCoast/WestCoast dimensions
 - Numbered rat spots for Master
 - Ability to modify subscriptions, add extra seats to club sub, etc. 
 - Bring to front feature for bales? Would require some redesign.


## Coder's QOL Update (2026-01-08)
 - Adjust Ctrl+C/V so that they work in text inputs and on the map for other things. 
 - Point to point measurement tool
 - Adjusted "Print" buttons so they're clearer (print w/ hides, print w/o hides)
 - Adjusted the size of the Step
 - Refactored BH Layer to prevent cross-contamination
 - Fixed multi-object select and drag
 - Removed DCMats from course settings; made their size editable by clicking on one after placement. 
 - Rearranged editor sidebar so that it makes more logical sense. 
 - Notes box
 - Full board boxes if people prefer (instead of just point-to-point measurement)
 - Duplicate map button available on Dashboard for nested maps. 
 - HIDE MARKERS: right click cycles through R/L/E; Alt+Click changes the border of the hide to indicate that it should be placed under a leaner. 

## New Year, New Editor Update (2026-01-03)
 - Nested course design: Now you can select a previously saved map to compare to in Course Settings! Comparison will show up in Map Statistics.
 - CSS change to prevent scrolling in sidebar
 - Prevent Map Statistics Box from moving off grid. Moves Map Statistics to printable legend instead of on the map.
 - Remove double click to delete, it is confusing. You can still select and hit Delete key or button.
 - Adjusted placement grid to 2" instead of 3"
 - DC Mat size can now be set in Course Settings. DC Mats can be rotated in 15 degree intervals.
 - All rotateable items should be rotateable in 15 degree increments. "Rotate Group" still only rotates at 90 degrees.
 - Created markers for gate, step, dead zone, and obstruction.

## EOY Update (2025-12-31)
 - Add a "Trial" at "Club" indicator to the print info (by Class Level). 
 - Allow judges to set bale sizes (instead of worrying about 3 stringers)
 - Copy/paste keyboard shortcuts
 - Anchor bale marking and anchor bale measurements from walls
 - Official Barn Hunt maps require legends - need to add a legend. 
 - Toast notification after successful save
 - Need to be able to label the type of wall/fencing. 
 - Provide options for choosing where grid numbering starts (lower/top left/right)
 - Lock down club seats to max 5.
 - Validation is blocking bale placement



 



