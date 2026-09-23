// Bundled English word lists for the examiner "word recall" and "spell backward"
// question categories. Curated to be common and easy to pronounce with TTS.

// Common concrete nouns for the recall drill (say a set, repeat forward/backward).
// Wrapped in a Set so accidental duplicates can never break "distinct words".
export const RECALL_WORDS: string[] = Array.from(new Set([
  'Airplane', 'Mango', 'Cloud', 'River', 'Table', 'Window', 'Garden', 'Pencil',
  'Bottle', 'Camera', 'Flower', 'Mountain', 'Island', 'Bridge', 'Rocket', 'Candle',
  'Basket', 'Ticket', 'Jacket', 'Mirror', 'Anchor', 'Feather', 'Lantern', 'Compass',
  'Hammer', 'Ladder', 'Marble', 'Napkin', 'Orange', 'Pillow', 'Rabbit', 'Saddle',
  'Turtle', 'Violin', 'Wagon', 'Yellow', 'Zebra', 'Apple', 'Banana', 'Castle',
  'Dolphin', 'Engine', 'Forest', 'Guitar', 'Harbor', 'Igloo', 'Jungle', 'Kitten',
  'Lemon', 'Meadow', 'Needle', 'Ocean', 'Parrot', 'Quilt', 'Ribbon', 'Silver',
  'Tiger', 'Umbrella', 'Village', 'Walnut', 'Yogurt', 'Almond', 'Bucket', 'Cactus',
  'Diamond', 'Eagle', 'Falcon', 'Grape', 'Helmet', 'Insect', 'Jelly', 'Kettle',
  'Lizard', 'Monkey', 'Nugget', 'Onion', 'Peanut', 'Rocket', 'Sailor', 'Tunnel',
  'Valley', 'Whistle', 'Yarn', 'Anchor', 'Bamboo', 'Cherry', 'Donkey', 'Elbow',
  'Fabric', 'Goose', 'Honey', 'Iron', 'Jewel', 'Koala', 'Lobby', 'Melon',
  'Noodle', 'Otter', 'Panda', 'Quiver', 'Radish', 'Saucer', 'Teapot', 'Uncle',
  'Velvet', 'Wallet', 'Acorn', 'Beetle', 'Coral', 'Daisy', 'Ember', 'Fossil',
  'Ginger', 'Hazel', 'Ivory', 'Jasmine', 'Kayak', 'Locket', 'Maple', 'Nectar',
  'Olive', 'Pebble', 'Quartz', 'Raisin', 'Sponge', 'Timber', 'Urchin', 'Vessel',
  'Willow', 'Yacht', 'Almond', 'Breeze', 'Cabin', 'Dune', 'Echo', 'Frost',
  'Glacier', 'Harvest', 'Icicle', 'Jetty', 'Kernel', 'Lagoon', 'Marsh', 'Nettle',
]));

// Simple, unambiguous 3–6 letter words for the spell-backward drill.
export const SPELL_WORDS: string[] = Array.from(new Set([
  'Cloud', 'Water', 'Chair', 'Green', 'Table', 'Plant', 'Stone', 'Bread',
  'Light', 'Music', 'River', 'Ocean', 'Tiger', 'Apple', 'Grape', 'Lemon',
  'Horse', 'Snake', 'Bird', 'Fish', 'Lamp', 'Book', 'Door', 'Star',
  'Moon', 'Tree', 'Milk', 'Rain', 'Snow', 'Wind', 'Fire', 'Gold',
  'Ring', 'Rose', 'Leaf', 'Nest', 'Boat', 'Road', 'Cake', 'Corn',
  'Frog', 'Goat', 'Hand', 'King', 'Lion', 'Nose', 'Pear', 'Ship',
  'Bear', 'Cat', 'Dog', 'Sun', 'Sky', 'Key', 'Box', 'Cup',
  'Pen', 'Hat', 'Bell', 'Coin', 'Duck', 'Farm', 'Gate', 'Hill',
  'Kite', 'Lake', 'Mask', 'Note', 'Palm', 'Ruby', 'Sand', 'Vase',
  'Wolf', 'Yarn', 'Bean', 'Clay', 'Dish', 'Fern', 'Glue', 'Iron',
]));
