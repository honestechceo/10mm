# Level backgrounds

Every 25 levels, the socket escapes to a new location:

| Levels | Location | File to upload |
|---|---|---|
| 1–25 | The Garage | (already done: `garage-art-1/2/3.jpg`) |
| 26–50 | The Driveway | `bg-driveway.jpg` |
| 51–75 | Parking Garage | `bg-parking.jpg` |
| 76–100 | The Junkyard | `bg-junkyard.jpg` |
| 101–125 | Parts Store | `bg-partsstore.jpg` |
| 126–150 | Dealer Service | `bg-dealership.jpg` |
| 151–175 | Pit Lane | `bg-pitlane.jpg` |
| 176–200 | Snowy Roadside | `bg-snow.jpg` |

Until a file is uploaded, that location uses the garage art with a color tint (sunset, night, dust, snow) as a stand-in. When you upload the file, it replaces the stand-in automatically, with no code changes.

## How to make one

1. In ChatGPT (image generation), paste the **style block** and then one **scene line**.
2. Download the image and save it as a **JPG** with the exact file name from the table.
3. In GitHub → `honestechceo/10mm` → **Add file → Upload files**, drop it in the top folder (next to `index.html`), and commit.

### Style block (paste first, every time)

> Wide landscape illustration, 3:2 aspect ratio, for the background of a 2D side-scrolling mobile game. Bold cartoon style with thick dark outlines, bright saturated colors and glossy highlights, same art style as a cheerful cartoon auto repair shop. Straight-on side view, camera at waist height, no perspective tilt. The FLOOR fills the bottom 30% of the image and is flat, smooth and EMPTY (no objects, people or vehicles on the bottom 30%) because game objects roll across it. A painted yellow line runs straight across the floor at about 80% of the image height. Keep the scene readable behind small game objects: no big text, no logos, no brand names, no real car badges or grilles, no license plates. Vehicles must be generic, unbranded designs. Left and right edges should continue naturally so the image can repeat side by side.

### Scene lines (paste one after the style block)

- **Driveway (`bg-driveway.jpg`):** A suburban home driveway at sunset, open two-car garage with shelves and a workbench, a generic family sedan with its hood up, warm orange-pink sky, trees and a fence, a concrete driveway as the floor.
- **Parking Garage (`bg-parking.jpg`):** A multi-level concrete parking garage at night, buzzing fluorescent tube lights, painted parking stall numbers, a few generic parked cars against the back wall, concrete pillars with yellow-black stripes, a glossy concrete floor.
- **Junkyard (`bg-junkyard.jpg`):** A dusty auto junkyard on a sunny afternoon, stacks of rusty crushed cars, piles of tires and engine blocks, a chain-link fence, a crane in the distance, a packed dirt floor.
- **Parts Store (`bg-partsstore.jpg`):** The inside of a bright auto parts store, tall shelves of oil bottles, filters, batteries and boxed parts, a front counter with a register, a bright tiled floor.
- **Dealer Service (`bg-dealership.jpg`):** A clean modern dealership service drive, glass walls, generic new cars waiting for service, service advisor desks, polished light grey epoxy floor.
- **Pit Lane (`bg-pitlane.jpg`):** A race track pit lane, a pit garage with tool carts and tire stacks, a generic race car (no sponsors or logos), grandstands and checkered flags in the background, a smooth asphalt pit lane as the floor.
- **Snowy Roadside (`bg-snow.jpg`):** A snowy country road shoulder on a winter evening, a generic pickup with hazard lights on and its hood up, pine trees covered in snow, falling snow, a plowed and salted road as the floor.

## Tips

- If the floor isn't empty, ask: "Same image, but remove everything from the bottom third so the floor is completely empty."
- If something branded shows up, ask: "Remove all logos, badges and brand names."
- Keep files under about 500 KB. In ChatGPT you can ask for "JPG, compressed for web".
