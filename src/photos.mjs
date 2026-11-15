// Stock photos in assets/photos/, used under the Freepik free license (attribution required).
// Credits are listed on the Terms page (#photo-credits) and linked from every footer.
// Files are center-cropped, resized and stripped of metadata; keep originals out of the repository.
const freepik = (slug, id) => `https://www.magnific.com/free-photo/${slug}_${id}.htm`;

export const photos = {
  'industry-construction': {title: 'Construction workers carrying a shovel to the construction site', author: 'jcomp', url: freepik('construction-workers-carrying-shovel-construction-site', 4550496)},
  'industry-manufacturing': {title: 'Industrial employees working together on a factory production line', author: 'aleksandarlittlewolf', url: freepik('industrial-employees-working-together-factory-production-line', 11034370)},
  'industry-mining': {title: 'Male worker with a bulldozer in a sand quarry', author: 'senivpetro', url: freepik('male-worker-with-bulldozer-sand-quarry', 16934288)},
  'industry-agriculture': {title: 'Farmer agronomist checking crops in a wheat field before harvest', author: 'aleksandarlittlewolf', url: freepik('portrait-senior-farmer-agronomist-wheat-field-checking-crops-before-harvest-holding-tablet-computer', 11450867)},
  'industry-solar': {title: 'Two engineers walking along rows of photovoltaic panels on a solar farm', author: 'jcomp', url: freepik('two-asian-young-engineers-walking-along-rows-photovoltaic-panels-solar-farm-they-use-laptop-computer-talking-together', 23906847)},
  'industry-automotive': {title: 'Auto mechanic examining a car undercarriage in a repair shop', author: 'Drazen Zigic', url: freepik('auto-mechanic-examining-undercarriage-car-with-flashlight-repair-shop', 29452254)},
  'industry-logistics': {title: 'Warehouse workers in a logistics center', author: 'Lifestylememory', url: freepik('engineer-staff-male-warehouse-worker-hard-hat-working-walking-through-logistics-center-warehouse-factory-construction-site-logistics-architect-forklife-driver-man-builder-indoors-background', 25118358)},
  'home-employers': {title: 'Hiring meeting with a professional HR team', author: 'DC Studio', url: freepik('hiring-process-meeting-confident-candidate-professional-team-from-hr-department', 424669869)},
  'home-partners': {title: 'Business partners meeting in a conference room', author: 'katemangostar', url: freepik('mix-raced-business-partners-meeting-conference-room', 2538613)},
  'about-mongolia': {title: 'Mongolian wild nature and landscape', author: 'wirestock', url: freepik('beautiful-scenery-mongolian-wild-nature-landscape', 13361855), alt: {en: 'Mountains and steppe in Mongolia', mn: 'Монголын уул, тал нутаг'}},
  'page-employers': {title: 'HR team member interviewing a candidate in an office', author: 'Drazen Zigic', url: freepik('member-human-resource-team-having-job-interview-with-candidate-office', 26346612)},
  'page-partners': {title: 'Business people shaking hands in a meeting room', author: 'rawpixel.com', url: freepik('business-people-shaking-hands-meeting-room', 2770460)},
};

// Same order as the industries list in src/content.mjs and src/mn.mjs.
export const industryPhotos = ['industry-construction', 'industry-manufacturing', 'industry-mining', 'industry-agriculture', 'industry-solar', 'industry-automotive', 'industry-logistics'];
