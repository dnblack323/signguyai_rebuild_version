const STUDIO_ASSET_TYPES = [
  'Logo', 'Required Brand Asset', 'Font Reference', 'Color Reference', 'Vehicle Photo',
  'Exact Vehicle Stock Reference', 'Customer Supplied Artwork', 'Style Inspiration',
  'Layout Inspiration', 'Competitor / Industry Reference', 'Product or Sponsor Image', 'Other'
];

const STUDIO_PROTECTION_RULES = [
  'Must Stay Exact', 'Keep Similar', 'Inspiration Only', 'Ignore During Generation'
];

const STUDIO_VIEWS = [
  ['driver', 'Driver side'], ['passenger', 'Passenger side'], ['front', 'Front'], ['rear', 'Rear'],
  ['three-quarter-front', 'Three-quarter front'], ['three-quarter-rear', 'Three-quarter rear'],
  ['concept-board', 'Full vehicle concept board']
];

const STUDIO_STYLE_OPTIONS = [
  'Clean corporate', 'Bold commercial', 'High-energy racing', 'Rugged industrial', 'Luxury / premium',
  'Modern minimal', 'Aggressive', 'Patriotic', 'Retro', 'Cartoon / illustrated', 'Streetwear',
  'Technical / futuristic', 'Dark and dramatic', 'Bright and playful', 'Custom'
];

const STUDIO_STATUSES = [
  'Waiting for Assets', 'Ready for Mockup Generation', 'Mockups Generated', 'Internal Review Needed',
  'Sent to Customer', 'Customer Feedback Received', 'Concept Direction Selected',
  'Professional Design In Progress', 'Proof Ready', 'Customer Approval Needed',
  'Approved for Production', 'Archived'
];

const STUDIO_CONTENT_FIELDS = [
  ['companyName', 'Company name'], ['tagline', 'Tagline'], ['phone', 'Phone number'], ['website', 'Website'],
  ['social', 'Social handle'], ['services', 'Services'], ['sponsors', 'Sponsor names'], ['raceNumber', 'Race number'],
  ['wording', 'Required wording'], ['disclaimers', 'Required disclaimers'], ['qrCode', 'QR code requirement'],
  ['callToAction', 'Call to action']
];

const STUDIO_BRAND_RULES = [
  ['preserveExact', 'Preserve all protected logos exactly'],
  ['officialColorsOnly', 'Use official brand colors only'],
  ['suggestSupportingColors', 'Allow AI to suggest supporting colors'],
  ['providedFontOnly', 'Use provided font only'],
  ['similarFontFallback', 'Allow similar font if provided font cannot be used'],
  ['keepCurrentLayout', 'Keep current brand layout style'],
  ['allowNewLayouts', 'Allow new layout ideas'],
  ['avoidGradients', 'Avoid gradients'],
  ['avoidCartoons', 'Avoid cartoon graphics'],
  ['avoidBusyBackgrounds', 'Avoid busy background graphics'],
  ['distanceReadable', 'Keep text readable at distance'],
  ['separateSponsors', 'Keep sponsor logos separate and legible']
];

const STUDIO_FEEDBACK_TAGS = [
  'I like this direction', 'I like the colors', 'I like the layout', 'I like the graphics',
  'I like the text placement', 'I want something bolder', 'I want something simpler',
  'I want more options like this', 'I do not like this direction'
];

let studioGenerating = false;
let studioCompareIds = [];
let studioEditingConceptId = null;

function studioUid(prefix = 'studio') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function studioEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function studioToday() {
  return new Date().toISOString().split('T')[0];
}

function studioTimestamp() {
  return new Date().toISOString();
}

function studioStorageKey(project) {
  return `wrap-lab-ai:mockup-studio:${project.id}`;
}

function studioDefaultContent(project) {
  const copyParts = String(project.designCopy || '').split(',').map(item => item.trim());
  return {
    companyName: { value: project.businessName || `${project.firstName} ${project.lastName}`, mode: 'required' },
    tagline: { value: '', mode: 'optional' },
    phone: { value: project.phone || copyParts.find(part => /\d{3}/.test(part)) || '', mode: 'required' },
    website: { value: '', mode: 'optional' },
    social: { value: '', mode: 'exclude' },
    services: { value: copyParts.slice(2).join(', '), mode: 'optional' },
    sponsors: { value: '', mode: 'exclude' },
    raceNumber: { value: '', mode: 'exclude' },
    wording: { value: project.designCopy || '', mode: 'optional' },
    disclaimers: { value: '', mode: 'exclude' },
    qrCode: { value: '', mode: 'exclude' },
    callToAction: { value: 'Call today', mode: 'optional' }
  };
}

function studioDefaultState(project) {
  const initialGoal = /trailer/i.test(project.wrapType) ? 'Trailer wrap'
    : /partial/i.test(project.wrapType) ? 'Partial wrap'
      : /commercial/i.test(project.wrapType) ? 'Commercial fleet wrap'
        : 'Full vehicle wrap';
  return {
    schemaVersion: 1,
    assets: [],
    vehicle: {
      sourceMode: 'Select stock vehicle template',
      templateKey: normalizeVehicleTemplateKey(project.inspectionTemplateType || project.bodyType || 'other'),
      year: project.year || '', make: project.make || '', model: project.model || '', trim: project.trim || '',
      cab: '', bedLength: '', roofType: project.roofHeight || '', sideDoors: '', trailerAttached: false,
      existingColor: project.originalColor || '', damageNotes: '', avoidAreas: '', coverAreas: '',
      requiredViews: ['driver']
    },
    direction: {
      goal: initialGoal,
      styles: ['Clean corporate'],
      notes: project.designBrief || '',
      content: studioDefaultContent(project),
      brandRules: {
        preserveExact: true, officialColorsOnly: false, suggestSupportingColors: true,
        providedFontOnly: false, similarFontFallback: true, keepCurrentLayout: false,
        allowNewLayouts: true, avoidGradients: false, avoidCartoons: true,
        avoidBusyBackgrounds: true, distanceReadable: true, separateSponsors: true
      }
    },
    settings: {
      conceptCount: 3, viewsPerConcept: 'all', quality: 'Standard', creativity: 'Balanced',
      brandFlexibility: 'Guided', textAccuracy: 'High', background: 'White studio',
      includeExplanation: true, includeTitle: true, surpriseMode: 'safe-bold'
    },
    concepts: [],
    status: 'Ready for Mockup Generation',
    activities: [],
    designerTasks: [],
    briefs: [],
    persistenceWarning: '',
    createdAt: studioTimestamp(),
    updatedAt: studioTimestamp()
  };
}

function ensureMockupStudio(project) {
  if (!project.mockupStudio) {
    try {
      const stored = localStorage.getItem(studioStorageKey(project));
      if (stored) project.mockupStudio = JSON.parse(stored);
    } catch (error) {
      console.warn('Mockup Studio saved state could not be read:', error);
    }
  }
  if (!project.mockupStudio) project.mockupStudio = studioDefaultState(project);
  const studio = project.mockupStudio;
  studio.assets = Array.isArray(studio.assets) ? studio.assets : [];
  studio.concepts = Array.isArray(studio.concepts) ? studio.concepts : [];
  studio.activities = Array.isArray(studio.activities) ? studio.activities : [];
  studio.designerTasks = Array.isArray(studio.designerTasks) ? studio.designerTasks : [];
  studio.briefs = Array.isArray(studio.briefs) ? studio.briefs : [];
  studio.vehicle.requiredViews = Array.isArray(studio.vehicle.requiredViews) && studio.vehicle.requiredViews.length
    ? studio.vehicle.requiredViews : ['driver'];
  if (!studio.activities.length) studioLogActivity(project, 'AI Mockup Studio initialized.', false);
  return studio;
}

function persistMockupStudio(project) {
  const studio = project.mockupStudio;
  if (!studio) return;
  studio.updatedAt = studioTimestamp();
  try {
    localStorage.setItem(studioStorageKey(project), JSON.stringify(studio));
    studio.persistenceWarning = '';
  } catch (error) {
    studio.persistenceWarning = 'Browser storage quota reached. Current-session data remains available, but large uploads or concepts may not survive a reload.';
    console.warn('Mockup Studio persistence warning:', error);
  }
}

function studioLogActivity(project, message, persist = true) {
  const studio = project.mockupStudio || studioDefaultState(project);
  project.mockupStudio = studio;
  studio.activities = Array.isArray(studio.activities) ? studio.activities : [];
  studio.activities.unshift({ id: studioUid('activity'), at: studioTimestamp(), actor: 'Shop Manager', message });
  studio.activities = studio.activities.slice(0, 100);
  if (persist) persistMockupStudio(project);
}

function studioAssetPrefix(type) {
  if (type === 'Logo' || type === 'Required Brand Asset') return 'logo';
  if (type === 'Font Reference') return 'font';
  if (type === 'Color Reference') return 'color';
  return 'image';
}

function studioNextReference(studio, type) {
  const prefix = studioAssetPrefix(type);
  const used = studio.assets
    .map(asset => asset.ref)
    .filter(ref => ref.startsWith(`@${prefix}`))
    .map(ref => Number(ref.replace(`@${prefix}`, '')) || 0);
  return `@${prefix}${Math.max(0, ...used) + 1}`;
}

function readStudioFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function inspectStudioImage(dataUrl) {
  return new Promise(resolve => {
    if (!String(dataUrl).startsWith('data:image/')) return resolve({ width: 0, height: 0, warning: '' });
    const image = new Image();
    image.onload = () => resolve({
      width: image.naturalWidth,
      height: image.naturalHeight,
      warning: image.naturalWidth < 800 || image.naturalHeight < 500
        ? `Low-resolution source (${image.naturalWidth}×${image.naturalHeight}); exact logo or vehicle detail may be unreliable.` : ''
    });
    image.onerror = () => resolve({ width: 0, height: 0, warning: 'Image dimensions could not be verified.' });
    image.src = dataUrl;
  });
}

async function handleStudioAssetUpload(event) {
  const project = getActiveProject();
  if (!project) return;
  const studio = ensureMockupStudio(project);
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const type = document.getElementById('studio-upload-type')?.value || 'Other';
  const protection = document.getElementById('studio-upload-protection')?.value || 'Inspiration Only';
  const note = document.getElementById('studio-upload-note')?.value.trim() || '';

  for (const file of files) {
    if (file.size > 8 * 1024 * 1024) {
      studioLogActivity(project, `Upload rejected for ${file.name}: exceeds the 8 MB browser-local limit.`);
      continue;
    }
    const dataUrl = await readStudioFile(file);
    const inspection = await inspectStudioImage(dataUrl);
    const asset = {
      id: studioUid('asset'), ref: studioNextReference(studio, type), name: file.name,
      type, protection, note, uploadedAt: studioTimestamp(), mimeType: file.type,
      size: file.size, dataUrl, width: inspection.width, height: inspection.height,
      qualityWarning: inspection.warning
    };
    studio.assets.push(asset);
    studioLogActivity(project, `${asset.ref} uploaded as ${type} with “${protection}” handling.`, false);
  }
  event.target.value = '';
  persistMockupStudio(project);
  renderMockupStudio(project);
}

async function replaceStudioAsset(assetId) {
  const project = getActiveProject();
  const studio = project && ensureMockupStudio(project);
  const asset = studio?.assets.find(item => item.id === assetId);
  if (!asset) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,.pdf,.eps,.ai,.svg,.ttf,.otf,.woff,.woff2';
  input.onchange = async event => {
    const file = event.target.files?.[0];
    if (!file || file.size > 8 * 1024 * 1024) return;
    asset.dataUrl = await readStudioFile(file);
    const inspection = await inspectStudioImage(asset.dataUrl);
    Object.assign(asset, {
      name: file.name, mimeType: file.type, size: file.size, uploadedAt: studioTimestamp(),
      width: inspection.width, height: inspection.height, qualityWarning: inspection.warning
    });
    studioLogActivity(project, `${asset.ref} replaced with ${file.name}.`);
    renderMockupStudio(project);
  };
  input.click();
}

function deleteStudioAsset(assetId) {
  const project = getActiveProject();
  const studio = project && ensureMockupStudio(project);
  const asset = studio?.assets.find(item => item.id === assetId);
  if (!asset) return;
  studio.assets = studio.assets.filter(item => item.id !== assetId);
  studioLogActivity(project, `${asset.ref} (${asset.name}) removed from project assets.`);
  renderMockupStudio(project);
}

function downloadStudioAsset(assetId) {
  const project = getActiveProject();
  const asset = project && ensureMockupStudio(project).assets.find(item => item.id === assetId);
  if (!asset) return;
  const link = document.createElement('a');
  link.href = asset.dataUrl;
  link.download = asset.name;
  link.click();
}

function studioUpdateAsset(assetId, field, value) {
  const project = getActiveProject();
  const asset = project && ensureMockupStudio(project).assets.find(item => item.id === assetId);
  if (!asset) return;
  asset[field] = value;
  studioLogActivity(project, `${asset.ref} ${field} updated to “${value}”.`);
  renderMockupStudio(project);
}

function studioUpdateVehicle(field, value) {
  const project = getActiveProject();
  if (!project) return;
  ensureMockupStudio(project).vehicle[field] = value;
  persistMockupStudio(project);
  renderStudioEstimate(project);
}

function studioToggleVehicleView(view, checked) {
  const project = getActiveProject();
  if (!project) return;
  const views = ensureMockupStudio(project).vehicle.requiredViews;
  if (checked && !views.includes(view)) views.push(view);
  if (!checked && views.length > 1) ensureMockupStudio(project).vehicle.requiredViews = views.filter(item => item !== view);
  persistMockupStudio(project);
  renderStudioEstimate(project);
}

function studioUpdateDirection(field, value) {
  const project = getActiveProject();
  if (!project) return;
  const studio = ensureMockupStudio(project);
  studio.direction[field] = value;
  if (field === 'notes') project.designBrief = value;
  persistMockupStudio(project);
  if (field === 'notes') renderStudioReferencePreview(project);
}

function studioToggleStyle(style) {
  const project = getActiveProject();
  if (!project) return;
  const styles = ensureMockupStudio(project).direction.styles;
  if (styles.includes(style)) {
    if (styles.length > 1) ensureMockupStudio(project).direction.styles = styles.filter(item => item !== style);
  } else {
    styles.push(style);
  }
  persistMockupStudio(project);
  renderMockupStudio(project);
}

function studioUpdateContent(field, property, value) {
  const project = getActiveProject();
  if (!project) return;
  const studio = ensureMockupStudio(project);
  studio.direction.content[field][property] = value;
  persistMockupStudio(project);
}

function studioToggleRule(rule, checked) {
  const project = getActiveProject();
  if (!project) return;
  ensureMockupStudio(project).direction.brandRules[rule] = checked;
  persistMockupStudio(project);
}

function studioUpdateSetting(field, value) {
  const project = getActiveProject();
  if (!project) return;
  const studio = ensureMockupStudio(project);
  studio.settings[field] = field === 'conceptCount' ? Math.max(1, Math.min(8, Number(value) || 1)) : value;
  persistMockupStudio(project);
  renderStudioEstimate(project);
}

function studioUpdateStatus(value) {
  const project = getActiveProject();
  if (!project) return;
  const studio = ensureMockupStudio(project);
  if (studio.status === value) return;
  studio.status = value;
  studioLogActivity(project, `Concept workflow status changed to “${value}”.`);
  renderMockupStudio(project);
}

function studioReferencedAssets(studio) {
  const matches = String(studio.direction.notes || '').match(/@(image|logo|font|color)\d+/gi) || [];
  return [...new Set(matches.map(match => match.toLowerCase()))]
    .map(ref => studio.assets.find(asset => asset.ref.toLowerCase() === ref))
    .filter(Boolean);
}

function renderStudioReferencePreview(project) {
  const container = document.getElementById('studio-reference-preview');
  if (!container) return;
  const assets = studioReferencedAssets(ensureMockupStudio(project));
  container.innerHTML = assets.length
    ? assets.map(asset => `<span class="studio-ref-chip">${studioEscape(asset.ref)} · ${studioEscape(asset.name)}</span>`).join('')
    : '<span class="studio-help">No recognized @asset references in Design Notes.</span>';
}

function studioGenerationEstimate(studio) {
  const viewCount = studio.settings.viewsPerConcept === 'all'
    ? studio.vehicle.requiredViews.length
    : Math.min(Number(studio.settings.viewsPerConcept) || 1, studio.vehicle.requiredViews.length);
  const images = studio.settings.conceptCount * Math.max(1, viewCount);
  const qualityMultiplier = { Draft: 0.5, Standard: 1, Presentation: 1.8 }[studio.settings.quality] || 1;
  return { views: Math.max(1, viewCount), images, credits: Math.ceil(images * qualityMultiplier) };
}

function renderStudioEstimate(project) {
  const studio = ensureMockupStudio(project);
  const estimate = studioGenerationEstimate(studio);
  const output = document.getElementById('studio-credit-estimate');
  if (output) output.innerHTML = `<strong>${estimate.images} mockup image${estimate.images === 1 ? '' : 's'}</strong><span>Estimated local credit equivalent: ${estimate.credits}</span>`;
}

function studioActiveAssets(studio) {
  return studio.assets.filter(asset => asset.protection !== 'Ignore During Generation');
}

function studioProtectedLogo(studio) {
  return studio.assets.find(asset => asset.protection === 'Must Stay Exact' && ['Logo', 'Required Brand Asset'].includes(asset.type) && String(asset.dataUrl).startsWith('data:image/'));
}

function studioPalette(project, studio) {
  const colors = String(project.designColors || '').match(/#[0-9a-fA-F]{6}/g) || [];
  const colorAssets = studio.assets.filter(asset => asset.type === 'Color Reference' && asset.protection !== 'Ignore During Generation');
  colorAssets.forEach(asset => {
    const noteColors = String(asset.note).match(/#[0-9a-fA-F]{6}/g) || [];
    colors.push(...noteColors);
  });
  return { primary: colors[0] || '#243d70', secondary: colors[1] || '#ffffff', accent: colors[2] || '#c78624' };
}

function studioConceptTitle(index, style) {
  const titles = [
    'Bold Roadside Readability', 'Premium Dark Industrial', 'Clean Service Fleet', 'Modern Diagonal Layout',
    'Minimal Brand Authority', 'Sponsor Forward Layout', 'High-Energy Visual Hierarchy', 'Confident Local Fleet'
  ];
  if (/racing|aggressive/i.test(style)) return index % 2 ? 'Sponsor Forward Layout' : 'High-Energy Race Style';
  if (/luxury|premium/i.test(style)) return 'Premium Brand Authority';
  if (/minimal|clean/i.test(style)) return index % 2 ? 'Modern Minimal Fleet' : 'Clean Service Fleet';
  return titles[index % titles.length];
}

function studioConceptExplanation(title, style, surprise) {
  const surpriseText = surprise ? 'This alternate direction changes the visual structure while retaining protected assets and required business content. ' : '';
  return `${surpriseText}${title} uses ${style.toLowerCase()} hierarchy, large brand recognition, and distance-readable contact information. Production design must still resolve panel breaks, windows, handles, bleed, and exact measurements.`;
}

function studioConceptWarnings(project, studio) {
  const warnings = [];
  if (!studio.vehicle.year || !studio.vehicle.make || !studio.vehicle.model) warnings.push('Exact vehicle year/make/model is incomplete.');
  const lowQuality = studioActiveAssets(studio).filter(asset => asset.qualityWarning);
  if (lowQuality.length) warnings.push(`${lowQuality.length} active source asset(s) have resolution warnings.`);
  const requiredMissing = Object.entries(studio.direction.content).filter(([, field]) => field.mode === 'required' && !String(field.value).trim());
  if (requiredMissing.length) warnings.push(`${requiredMissing.length} required content field(s) are empty.`);
  if (String(project.designCopy || '').length > 120) warnings.push('Required copy is long; roadside readability needs designer review.');
  return warnings;
}

function studioViewsForBatch(studio) {
  const selected = studio.vehicle.requiredViews;
  if (studio.settings.viewsPerConcept === 'all') return selected;
  return selected.slice(0, Math.max(1, Number(studio.settings.viewsPerConcept) || 1));
}

async function generateStudioConcepts(surprise = false) {
  const project = getActiveProject();
  if (!project || studioGenerating) return;
  const studio = ensureMockupStudio(project);
  const requiredMissing = Object.entries(studio.direction.content).filter(([, field]) => field.mode === 'required' && !String(field.value).trim());
  if (requiredMissing.length) {
    alert(`Complete required content before generation: ${requiredMissing.map(([key]) => key).join(', ')}`);
    return;
  }

  studioGenerating = true;
  renderStudioGenerationState(true, 'Preparing protected assets and vehicle references...');
  const activeAssets = studioActiveAssets(studio);
  const protectedLogo = studioProtectedLogo(studio);
  const assetRefs = activeAssets.map(asset => asset.ref);
  const protectedRefs = activeAssets.filter(asset => asset.protection === 'Must Stay Exact').map(asset => asset.ref);
  const views = studioViewsForBatch(studio);
  const palette = studioPalette(project, studio);
  const styles = studio.direction.styles.length ? studio.direction.styles : ['Clean corporate'];
  const surpriseStyles = ['Clean corporate', 'Bold commercial', 'Aggressive', 'Modern minimal', 'Luxury / premium'];
  const conceptCount = surprise && studio.settings.surpriseMode.startsWith('five') ? 5 : studio.settings.conceptCount;

  try {
    for (let index = 0; index < conceptCount; index += 1) {
      renderStudioGenerationState(true, `Generating concept ${index + 1} of ${conceptCount}...`);
      const style = surprise ? surpriseStyles[index % surpriseStyles.length] : styles[index % styles.length];
      const title = studioConceptTitle(studio.concepts.length + index, style);
      const direction = /minimal|clean/i.test(style) ? 'cleaner' : /aggressive|racing|bold/i.test(style) ? 'direction' : 'generate';
      const images = [];
      for (const view of views) {
        const dataUrl = await buildGeneratedMockupDataUrl(project, direction, {
          templateKey: studio.vehicle.templateKey,
          view,
          palette,
          logoDataUrl: protectedLogo?.dataUrl || '',
          conceptLabel: title
        });
        images.push({ id: studioUid('view'), view, dataUrl });
      }
      const concept = {
        id: studioUid('concept'), number: studio.concepts.length + 1, title, style,
        createdAt: studioTimestamp(), explanation: studio.settings.includeExplanation ? studioConceptExplanation(title, style, surprise) : '',
        assetRefs, protectedRefs, handlingRules: Object.fromEntries(activeAssets.map(asset => [asset.ref, asset.protection])),
        images, activeViewIndex: 0, favorite: false, selected: false, sentToPortal: false,
        archived: false, compare: false, warnings: studioConceptWarnings(project, studio),
        generation: { ...studio.settings, surprise, views: [...views], palette, provider: 'Browser-local deterministic canvas renderer' },
        versions: [{ version: 1, createdAt: studioTimestamp(), instruction: surprise ? 'Surprise Me initial generation' : 'Initial generation', images: images.map(image => ({ ...image })) }],
        activeVersion: 1,
        customer: { selected: false, rating: 0, feedbackTags: [], comment: '', annotations: [], markupDataUrl: '', markupEnabled: false }
      };
      studio.concepts.push(concept);
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    studio.status = 'Internal Review Needed';
    project.mockupImage = studio.concepts.at(-1)?.images[0]?.dataUrl || project.mockupImage;
    studioLogActivity(project, `Generated ${conceptCount} concept mockup${conceptCount === 1 ? '' : 's'} across ${views.length} view${views.length === 1 ? '' : 's'}${surprise ? ' using Surprise Me mode' : ''}.`, false);
    persistMockupStudio(project);
  } catch (error) {
    console.error('AI Mockup Studio generation failed:', error);
    studioLogActivity(project, `Concept generation failed: ${error.message}`, false);
    persistMockupStudio(project);
  } finally {
    studioGenerating = false;
    renderMockupStudio(project);
  }
}

function studioSurpriseMe() {
  const project = getActiveProject();
  if (!project) return;
  const studio = ensureMockupStudio(project);
  const mode = studio.settings.surpriseMode;
  studio.settings.conceptCount = mode.startsWith('five') ? 5 : 3;
  studio.direction.styles = mode === 'traditional-modern-aggressive'
    ? ['Clean corporate', 'Modern minimal', 'Aggressive']
    : mode === 'safe-bold' ? ['Clean corporate', 'Bold commercial', 'Aggressive']
      : ['Clean corporate', 'Modern minimal', 'Bold commercial'];
  persistMockupStudio(project);
  generateStudioConcepts(true);
}

function renderStudioGenerationState(active, message) {
  const panel = document.getElementById('studio-generation-state');
  if (!panel) return;
  panel.classList.toggle('active', active);
  panel.innerHTML = active ? `<div class="spinner"></div><strong>${studioEscape(message)}</strong><span>Protected assets and required fields remain attached to this batch.</span>` : '';
}

function studioFindConcept(conceptId) {
  const project = getActiveProject();
  return project && ensureMockupStudio(project).concepts.find(concept => concept.id === conceptId);
}

function studioToggleConcept(conceptId, field) {
  const project = getActiveProject();
  const concept = studioFindConcept(conceptId);
  if (!project || !concept) return;
  concept[field] = !concept[field];
  studioLogActivity(project, `Concept ${concept.number} ${concept[field] ? field : `${field} removed`}.`);
  renderMockupStudio(project);
}

function studioSetConceptView(conceptId, index) {
  const project = getActiveProject();
  const concept = studioFindConcept(conceptId);
  if (!project || !concept || !concept.images[index]) return;
  concept.activeViewIndex = index;
  persistMockupStudio(project);
  renderMockupStudio(project);
}

function studioToggleCompare(conceptId) {
  const project = getActiveProject();
  const concept = studioFindConcept(conceptId);
  if (!project || !concept) return;
  if (studioCompareIds.includes(conceptId)) studioCompareIds = studioCompareIds.filter(id => id !== conceptId);
  else {
    studioCompareIds.push(conceptId);
    if (studioCompareIds.length > 3) studioCompareIds.shift();
  }
  concept.compare = studioCompareIds.includes(conceptId);
  persistMockupStudio(project);
  renderMockupStudio(project);
}

function studioSendConceptToPortal(conceptId) {
  const project = getActiveProject();
  const studio = project && ensureMockupStudio(project);
  const concept = studio?.concepts.find(item => item.id === conceptId);
  if (!project || !concept) return;
  concept.sentToPortal = true;
  concept.selected = true;
  studio.status = 'Sent to Customer';
  studioLogActivity(project, `Concept ${concept.number} sent to the customer portal for direction review.`);
  renderMockupStudio(project);
}

function studioArchiveConcept(conceptId) {
  const project = getActiveProject();
  const concept = studioFindConcept(conceptId);
  if (!project || !concept) return;
  concept.archived = true;
  concept.sentToPortal = false;
  studioLogActivity(project, `Concept ${concept.number} archived.`);
  renderMockupStudio(project);
}

function openStudioConceptEditor(conceptId) {
  studioEditingConceptId = conceptId;
  const concept = studioFindConcept(conceptId);
  const modal = document.getElementById('studio-concept-edit-modal');
  if (!concept || !modal) return;
  modal.classList.add('active');
  document.getElementById('studio-refinement-instruction').value = 'Make this cleaner and easier to read from distance';
}

function closeStudioConceptEditor() {
  document.getElementById('studio-concept-edit-modal')?.classList.remove('active');
  studioEditingConceptId = null;
}

async function applyStudioConceptRefinement() {
  const project = getActiveProject();
  const studio = project && ensureMockupStudio(project);
  const concept = studio?.concepts.find(item => item.id === studioEditingConceptId);
  const instruction = document.getElementById('studio-refinement-instruction')?.value.trim();
  if (!project || !concept || !instruction || studioGenerating) return;
  studioGenerating = true;
  closeStudioConceptEditor();
  renderStudioGenerationState(true, `Creating Concept ${concept.number} variation...`);
  const direction = /clean|negative|simple|premium/i.test(instruction) ? 'cleaner' : /bold|aggressive|more/i.test(instruction) ? 'direction' : 'generate';
  const protectedLogo = studioProtectedLogo(studio);
  const palette = studioPalette(project, studio);
  try {
    const images = [];
    for (const viewImage of concept.images) {
      images.push({
        id: studioUid('view'), view: viewImage.view,
        dataUrl: await buildGeneratedMockupDataUrl(project, direction, {
          templateKey: studio.vehicle.templateKey, view: viewImage.view, palette,
          logoDataUrl: protectedLogo?.dataUrl || '', conceptLabel: `${concept.title} V${concept.versions.length + 1}`
        })
      });
    }
    const version = concept.versions.length + 1;
    concept.versions.push({ version, createdAt: studioTimestamp(), instruction, images: images.map(image => ({ ...image })) });
    concept.activeVersion = version;
    concept.images = images;
    studioLogActivity(project, `Concept ${concept.number} version ${version} created: ${instruction}.`, false);
    persistMockupStudio(project);
  } catch (error) {
    console.error('Concept refinement failed:', error);
    studioLogActivity(project, `Concept ${concept.number} refinement failed: ${error.message}`, false);
  } finally {
    studioGenerating = false;
    renderMockupStudio(project);
  }
}

function studioSelectConceptVersion(conceptId, versionNumber) {
  const project = getActiveProject();
  const concept = studioFindConcept(conceptId);
  const version = concept?.versions.find(item => item.version === Number(versionNumber));
  if (!project || !concept || !version) return;
  concept.activeVersion = version.version;
  concept.images = version.images.map(image => ({ ...image }));
  persistMockupStudio(project);
  renderMockupStudio(project);
}

function studioCreateDesignerBrief() {
  const project = getActiveProject();
  const studio = project && ensureMockupStudio(project);
  if (!project || !studio) return;
  const concepts = studio.concepts.filter(concept => concept.selected && !concept.archived);
  if (!concepts.length) {
    alert('Select at least one concept before creating a designer brief.');
    return;
  }
  const brief = {
    id: studioUid('brief'), createdAt: studioTimestamp(), projectId: project.id,
    customer: project.businessName || `${project.firstName} ${project.lastName}`,
    vehicle: `${studio.vehicle.year} ${studio.vehicle.make} ${studio.vehicle.model} ${studio.vehicle.trim}`.trim(),
    goal: studio.direction.goal, requiredContent: studio.direction.content,
    assets: studio.assets.map(asset => ({ ref: asset.ref, name: asset.name, type: asset.type, protection: asset.protection, note: asset.note })),
    colors: project.designColors, fonts: project.designFonts, designNotes: studio.direction.notes,
    selectedConcepts: concepts.map(concept => ({ number: concept.number, title: concept.title, style: concept.style, explanation: concept.explanation, version: concept.activeVersion })),
    customerNotes: concepts.map(concept => ({ number: concept.number, comment: concept.customer.comment, annotations: concept.customer.annotations })),
    requiredViews: studio.vehicle.requiredViews,
    productionNotes: 'Resolve exact vehicle template, measurements, bleed, panel breaks, windows, handles, mirrors, obstructions, seams, and print-ready artwork before final proof.',
    attachments: ['Order', 'Order Item', 'Work Order Summary']
  };
  studio.briefs.push(brief);
  const fileName = `${project.id}-AI-CONCEPT-DESIGNER-BRIEF-${studio.briefs.length}.html`;
  const html = studioDesignerBriefHtml(project, brief);
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  project.files.push({ name: fileName, category: 'Designer briefs', date: studioToday(), customerVisible: false, marketingPermission: false, dataUrl });
  studioLogActivity(project, `Designer-ready brief created from ${concepts.length} selected concept${concepts.length === 1 ? '' : 's'}.`);
  downloadStudioBrief(brief.id);
  renderMockupStudio(project);
}

function studioDesignerBriefHtml(project, brief) {
  const required = Object.entries(brief.requiredContent)
    .filter(([, field]) => field.mode !== 'exclude' && field.value)
    .map(([key, field]) => `<li><strong>${studioEscape(key)}:</strong> ${studioEscape(field.value)} (${studioEscape(field.mode)})</li>`).join('');
  const assets = brief.assets.map(asset => `<li>${studioEscape(asset.ref)} — ${studioEscape(asset.name)} — ${studioEscape(asset.type)} — ${studioEscape(asset.protection)}</li>`).join('');
  const concepts = brief.selectedConcepts.map(concept => `<li>Concept ${concept.number}: ${studioEscape(concept.title)} — ${studioEscape(concept.style)} — Version ${concept.version}<br>${studioEscape(concept.explanation)}</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${studioEscape(project.id)} Designer Brief</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;color:#171b21}h1{border-bottom:3px solid #171b21;padding-bottom:12px}section{border:1px solid #d5d9de;padding:18px;margin:16px 0;border-radius:8px}li{margin:7px 0}.warning{background:#fff7e6;border-color:#d1a644}</style></head><body><h1>WRAP LAB AI — DESIGNER-READY CONCEPT BRIEF</h1><p><strong>Order:</strong> ${studioEscape(brief.projectId)} &nbsp; <strong>Customer:</strong> ${studioEscape(brief.customer)}</p><section><h2>Vehicle & Goal</h2><p>${studioEscape(brief.vehicle)}</p><p>${studioEscape(brief.goal)}</p><p><strong>Required views:</strong> ${studioEscape(brief.requiredViews.join(', '))}</p></section><section><h2>Required Content</h2><ul>${required}</ul></section><section><h2>Assets & Handling Rules</h2><ul>${assets}</ul><p><strong>Colors:</strong> ${studioEscape(brief.colors)}</p><p><strong>Fonts:</strong> ${studioEscape(brief.fonts)}</p></section><section><h2>Design Notes</h2><p>${studioEscape(brief.designNotes)}</p></section><section><h2>Selected Concepts</h2><ul>${concepts}</ul></section><section><h2>Customer Feedback</h2><pre>${studioEscape(JSON.stringify(brief.customerNotes, null, 2))}</pre></section><section class="warning"><h2>Production Handoff Requirement</h2><p>${studioEscape(brief.productionNotes)}</p></section></body></html>`;
}

function downloadStudioBrief(briefId) {
  const project = getActiveProject();
  const studio = project && ensureMockupStudio(project);
  const brief = studio?.briefs.find(item => item.id === briefId);
  if (!project || !brief) return;
  const blob = new Blob([studioDesignerBriefHtml(project, brief)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.id}-designer-ready-concept-brief.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderStudioAssetCards(studio) {
  if (!studio.assets.length) return '<div class="studio-empty"><i class="fa-solid fa-folder-plus"></i><strong>No studio assets yet</strong><span>Upload logos, vehicle photos, fonts, colors, or inspiration.</span></div>';
  return studio.assets.map(asset => {
    const preview = String(asset.dataUrl).startsWith('data:image/')
      ? `<img src="${asset.dataUrl}" alt="${studioEscape(asset.name)} preview">`
      : `<div class="studio-file-icon"><i class="fa-solid fa-file"></i></div>`;
    return `<article class="studio-asset-card">
      <div class="studio-asset-thumb">${preview}<span class="studio-ref-tag">${studioEscape(asset.ref)}</span></div>
      <div class="studio-asset-body">
        <strong title="${studioEscape(asset.name)}">${studioEscape(asset.name)}</strong>
        <span>${studioEscape(asset.type)} · ${new Date(asset.uploadedAt).toLocaleDateString()}</span>
        <select class="studio-mini-select" onchange="studioUpdateAsset('${asset.id}','protection',this.value)">${STUDIO_PROTECTION_RULES.map(rule => `<option${asset.protection === rule ? ' selected' : ''}>${rule}</option>`).join('')}</select>
        ${asset.note ? `<p>${studioEscape(asset.note)}</p>` : ''}
        ${asset.qualityWarning ? `<p class="studio-warning"><i class="fa-solid fa-triangle-exclamation"></i>${studioEscape(asset.qualityWarning)}</p>` : ''}
        <div class="studio-card-actions">
          <button type="button" title="Replace" onclick="replaceStudioAsset('${asset.id}')"><i class="fa-solid fa-rotate"></i></button>
          <button type="button" title="View full size" onclick="window.open('${asset.dataUrl}','_blank')"><i class="fa-solid fa-expand"></i></button>
          <button type="button" title="Download" onclick="downloadStudioAsset('${asset.id}')"><i class="fa-solid fa-download"></i></button>
          <button type="button" title="Delete" class="danger" onclick="deleteStudioAsset('${asset.id}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
    </article>`;
  }).join('');
}

function renderStudioConceptCards(studio) {
  const concepts = studio.concepts.filter(concept => !concept.archived);
  if (!concepts.length) return '<div class="studio-gallery-empty"><i class="fa-solid fa-images"></i><strong>No concepts generated</strong><span>Configure the batch and generate concepts. Existing project assets remain unchanged.</span></div>';
  return concepts.map(concept => {
    const activeImage = concept.images[concept.activeViewIndex] || concept.images[0];
    const compareActive = studioCompareIds.includes(concept.id);
    return `<article class="studio-concept-card${concept.selected ? ' selected' : ''}">
      <div class="studio-concept-image">
        <img src="${activeImage?.dataUrl || ''}" alt="Concept ${concept.number} ${studioEscape(concept.title)}">
        <div class="studio-concept-flags"><span>Concept ${concept.number}</span>${concept.favorite ? '<span class="favorite">★ Favorite</span>' : ''}${concept.sentToPortal ? '<span class="sent">Portal</span>' : ''}</div>
      </div>
      <div class="studio-concept-body">
        <div class="studio-concept-heading"><div><strong>${studioEscape(concept.title)}</strong><span>${studioEscape(concept.style)} · V${concept.activeVersion}</span></div><select onchange="studioSelectConceptVersion('${concept.id}',this.value)">${concept.versions.map(version => `<option value="${version.version}"${version.version === concept.activeVersion ? ' selected' : ''}>Version ${version.version}</option>`).join('')}</select></div>
        <div class="studio-view-tabs">${concept.images.map((image, index) => `<button type="button" class="${index === concept.activeViewIndex ? 'active' : ''}" onclick="studioSetConceptView('${concept.id}',${index})">${studioEscape(image.view.replaceAll('-', ' '))}</button>`).join('')}</div>
        <p>${studioEscape(concept.explanation)}</p>
        <div class="studio-meta-line"><strong>Assets:</strong> ${concept.assetRefs.length ? concept.assetRefs.map(ref => studioEscape(ref)).join(', ') : 'Project fields only'}</div>
        ${concept.protectedRefs.length ? `<div class="studio-protected"><i class="fa-solid fa-lock"></i>Protected: ${concept.protectedRefs.map(ref => studioEscape(ref)).join(', ')}</div>` : ''}
        ${concept.warnings.map(warning => `<div class="studio-warning"><i class="fa-solid fa-triangle-exclamation"></i>${studioEscape(warning)}</div>`).join('')}
        <div class="studio-concept-actions">
          <button type="button" class="${concept.favorite ? 'active' : ''}" onclick="studioToggleConcept('${concept.id}','favorite')"><i class="fa-${concept.favorite ? 'solid' : 'regular'} fa-star"></i>Favorite</button>
          <button type="button" class="${concept.selected ? 'active' : ''}" onclick="studioToggleConcept('${concept.id}','selected')"><i class="fa-solid fa-check"></i>Select</button>
          <button type="button" onclick="openStudioConceptEditor('${concept.id}')"><i class="fa-solid fa-sliders"></i>Refine</button>
          <button type="button" class="${compareActive ? 'active' : ''}" onclick="studioToggleCompare('${concept.id}')"><i class="fa-solid fa-code-compare"></i>Compare</button>
          <button type="button" class="${concept.sentToPortal ? 'active' : ''}" onclick="studioSendConceptToPortal('${concept.id}')"><i class="fa-solid fa-paper-plane"></i>Portal</button>
          <button type="button" onclick="studioToggleConcept('${concept.id}','selected')"><i class="fa-solid fa-file-lines"></i>Brief</button>
          <button type="button" class="danger" onclick="studioArchiveConcept('${concept.id}')"><i class="fa-solid fa-box-archive"></i>Archive</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

function renderStudioCompareTray(studio) {
  const concepts = studioCompareIds.map(id => studio.concepts.find(concept => concept.id === id)).filter(Boolean);
  if (!concepts.length) return '';
  return `<section class="studio-compare-tray"><div class="studio-section-heading"><div><span>COMPARE</span><h4>Concept Comparison</h4></div><button type="button" class="btn btn-small" onclick="studioCompareIds=[];renderMockupStudio(getActiveProject())">Clear</button></div><div class="studio-compare-grid">${concepts.map(concept => `<div><img src="${concept.images[concept.activeViewIndex]?.dataUrl || ''}" alt="${studioEscape(concept.title)}"><strong>Concept ${concept.number}: ${studioEscape(concept.title)}</strong></div>`).join('')}</div></section>`;
}

function renderStudioActivity(studio) {
  return studio.activities.slice(0, 8).map(item => `<div class="studio-activity-item"><span>${new Date(item.at).toLocaleString()}</span><p>${studioEscape(item.message)}</p></div>`).join('');
}

function renderMockupStudio(project = getActiveProject()) {
  const root = document.getElementById('mockup-studio-root');
  if (!root || !project) return;
  const studio = ensureMockupStudio(project);
  const estimate = studioGenerationEstimate(studio);
  const referenceAssets = studioReferencedAssets(studio);
  const vehicleOptions = VEHICLE_TYPES.map(vehicle => `<option value="${vehicle.key}"${studio.vehicle.templateKey === vehicle.key ? ' selected' : ''}>${vehicle.label}</option>`).join('');
  const goalOptions = ['Full vehicle wrap','Partial wrap','Spot graphics','Commercial fleet wrap','Race car wrap','Trailer wrap','Food truck wrap','Service vehicle branding','Promotional wrap','Event vehicle','Concept only'];

  root.innerHTML = `
    <div class="studio-topbar">
      <div><span class="studio-eyebrow">WRAP LAB AI</span><h3>AI Mockup Studio</h3><p>Guided concept development using protected project assets, structured direction, and vehicle-aware mockups.</p></div>
      <div class="studio-topbar-status"><label>Concept workflow</label><select onchange="studioUpdateStatus(this.value)">${STUDIO_STATUSES.map(status => `<option${studio.status === status ? ' selected' : ''}>${status}</option>`).join('')}</select></div>
    </div>
    ${studio.persistenceWarning ? `<div class="studio-system-warning"><i class="fa-solid fa-database"></i>${studioEscape(studio.persistenceWarning)}</div>` : ''}
    <div class="studio-layout">
      <aside class="studio-column studio-assets-column">
        <div class="studio-section-heading"><div><span>01</span><h4>Project Assets</h4></div><span class="studio-count">${studio.assets.length}</span></div>
        <div class="studio-upload-panel">
          <label class="studio-upload-drop"><i class="fa-solid fa-cloud-arrow-up"></i><strong>Upload reference assets</strong><span>Images, SVG, PDF, EPS, AI, and font references · 8 MB each</span><input id="studio-asset-file" type="file" multiple accept="image/*,.pdf,.eps,.ai,.svg,.ttf,.otf,.woff,.woff2" onchange="handleStudioAssetUpload(event)"></label>
          <div class="studio-upload-fields"><select id="studio-upload-type">${STUDIO_ASSET_TYPES.map(type => `<option>${type}</option>`).join('')}</select><select id="studio-upload-protection">${STUDIO_PROTECTION_RULES.map(rule => `<option>${rule}</option>`).join('')}</select><input id="studio-upload-note" placeholder="Optional asset note"></div>
        </div>
        <div class="studio-asset-list">${renderStudioAssetCards(studio)}</div>

        <details class="studio-details" open><summary>Vehicle Setup</summary><div class="studio-details-body">
          <label>Vehicle source<select onchange="studioUpdateVehicle('sourceMode',this.value)">${['Upload actual customer vehicle photo','Upload multiple vehicle photos','Select stock vehicle template','Search/select exact vehicle stock image','Use generic vehicle silhouette only','Use previously saved customer vehicle'].map(mode => `<option${studio.vehicle.sourceMode === mode ? ' selected' : ''}>${mode}</option>`).join('')}</select></label>
          <label>Stock template<select onchange="studioUpdateVehicle('templateKey',this.value)">${vehicleOptions}</select></label>
          <div class="studio-mini-grid"><label>Year<input value="${studioEscape(studio.vehicle.year)}" onchange="studioUpdateVehicle('year',this.value)"></label><label>Make<input value="${studioEscape(studio.vehicle.make)}" onchange="studioUpdateVehicle('make',this.value)"></label><label>Model<input value="${studioEscape(studio.vehicle.model)}" onchange="studioUpdateVehicle('model',this.value)"></label><label>Trim/package<input value="${studioEscape(studio.vehicle.trim)}" onchange="studioUpdateVehicle('trim',this.value)"></label><label>Cab configuration<input value="${studioEscape(studio.vehicle.cab)}" onchange="studioUpdateVehicle('cab',this.value)"></label><label>Bed length<input value="${studioEscape(studio.vehicle.bedLength)}" onchange="studioUpdateVehicle('bedLength',this.value)"></label><label>Roof type<input value="${studioEscape(studio.vehicle.roofType)}" onchange="studioUpdateVehicle('roofType',this.value)"></label><label>Side doors<input value="${studioEscape(studio.vehicle.sideDoors)}" onchange="studioUpdateVehicle('sideDoors',this.value)"></label></div>
          <label>Existing wrap / paint color<input value="${studioEscape(studio.vehicle.existingColor)}" onchange="studioUpdateVehicle('existingColor',this.value)"></label>
          <label>Damage / obstruction notes<textarea onchange="studioUpdateVehicle('damageNotes',this.value)">${studioEscape(studio.vehicle.damageNotes)}</textarea></label>
          <label>Important areas to avoid<textarea onchange="studioUpdateVehicle('avoidAreas',this.value)">${studioEscape(studio.vehicle.avoidAreas)}</textarea></label>
          <label>Areas that must be covered<textarea onchange="studioUpdateVehicle('coverAreas',this.value)">${studioEscape(studio.vehicle.coverAreas)}</textarea></label>
          <fieldset><legend>Required mockup views</legend><div class="studio-check-grid">${STUDIO_VIEWS.map(([value,label]) => `<label><input type="checkbox" ${studio.vehicle.requiredViews.includes(value) ? 'checked' : ''} onchange="studioToggleVehicleView('${value}',this.checked)">${label}</label>`).join('')}</div></fieldset>
        </div></details>
        <details class="studio-details"><summary>AI Suggested Inspiration</summary><div class="studio-details-body"><div class="studio-suggestion-list"><span>Prioritize 30-foot readability</span><span>Keep service hierarchy above decorative graphics</span><span>Resolve door gaps and wheel arches in production design</span><span>Use negative space around phone and URL</span></div></div></details>
      </aside>

      <section class="studio-column studio-direction-column">
        <div class="studio-section-heading"><div><span>02</span><h4>Design Direction</h4></div></div>
        <label class="studio-field">Project goal<select onchange="studioUpdateDirection('goal',this.value)">${goalOptions.map(goal => `<option${studio.direction.goal === goal ? ' selected' : ''}>${goal}</option>`).join('')}</select></label>
        <div class="studio-field"><label>Style direction</label><div class="studio-style-chips">${STUDIO_STYLE_OPTIONS.map(style => `<button type="button" class="${studio.direction.styles.includes(style) ? 'active' : ''}" onclick="studioToggleStyle('${style.replaceAll("'","\\'")}')">${style}</button>`).join('')}</div></div>
        <label class="studio-field">Design Notes<textarea class="studio-design-notes" placeholder="Reference assets directly, for example: Use @logo1 exactly and @image2 as inspiration only." oninput="studioUpdateDirection('notes',this.value)">${studioEscape(studio.direction.notes)}</textarea></label>
        <div id="studio-reference-preview" class="studio-reference-preview">${referenceAssets.length ? referenceAssets.map(asset => `<span class="studio-ref-chip">${studioEscape(asset.ref)} · ${studioEscape(asset.name)}</span>`).join('') : '<span class="studio-help">No recognized @asset references in Design Notes.</span>'}</div>

        <details class="studio-details" open><summary>Required Content</summary><div class="studio-details-body studio-content-grid">${STUDIO_CONTENT_FIELDS.map(([key,label]) => { const field = studio.direction.content[key]; return `<div class="studio-content-row"><label>${label}<input value="${studioEscape(field.value)}" onchange="studioUpdateContent('${key}','value',this.value)"></label><select aria-label="${label} inclusion" onchange="studioUpdateContent('${key}','mode',this.value)"><option value="required"${field.mode === 'required' ? ' selected' : ''}>Required</option><option value="optional"${field.mode === 'optional' ? ' selected' : ''}>Optional</option><option value="exclude"${field.mode === 'exclude' ? ' selected' : ''}>Do not include</option></select></div>`; }).join('')}</div></details>
        <details class="studio-details" open><summary>Brand Rules</summary><div class="studio-details-body studio-rule-list">${STUDIO_BRAND_RULES.map(([key,label]) => `<label><input type="checkbox" ${studio.direction.brandRules[key] ? 'checked' : ''} onchange="studioToggleRule('${key}',this.checked)"><span>${label}</span></label>`).join('')}</div></details>
      </section>

      <aside class="studio-column studio-controls-column">
        <div class="studio-section-heading"><div><span>03</span><h4>Generation Controls</h4></div></div>
        <div class="studio-surprise-card"><i class="fa-solid fa-dice"></i><div><strong>Surprise Me</strong><span>Alternate structures that still preserve protected assets and required content.</span></div><select onchange="studioUpdateSetting('surpriseMode',this.value)"><option value="safe-bold"${studio.settings.surpriseMode === 'safe-bold' ? ' selected' : ''}>One safe + two bold</option><option value="three-unexpected"${studio.settings.surpriseMode === 'three-unexpected' ? ' selected' : ''}>3 unexpected layouts</option><option value="five-unexpected"${studio.settings.surpriseMode === 'five-unexpected' ? ' selected' : ''}>5 unexpected layouts</option><option value="traditional-modern-aggressive"${studio.settings.surpriseMode === 'traditional-modern-aggressive' ? ' selected' : ''}>Traditional + modern + aggressive</option><option value="best-practices">Best practices for vehicle/business</option><option value="customer-appeal">Likely customer appeal</option><option value="readability">Readability and hierarchy</option></select><button type="button" onclick="studioSurpriseMe()"><i class="fa-solid fa-wand-magic-sparkles"></i>Generate Surprise Batch</button></div>
        <div class="studio-control-grid">
          <label>Concepts<input type="number" min="1" max="8" value="${studio.settings.conceptCount}" onchange="studioUpdateSetting('conceptCount',this.value)"></label>
          <label>Views per concept<select onchange="studioUpdateSetting('viewsPerConcept',this.value)"><option value="1"${studio.settings.viewsPerConcept === '1' ? ' selected' : ''}>1</option><option value="2"${studio.settings.viewsPerConcept === '2' ? ' selected' : ''}>2</option><option value="3"${studio.settings.viewsPerConcept === '3' ? ' selected' : ''}>3</option><option value="all"${studio.settings.viewsPerConcept === 'all' ? ' selected' : ''}>All selected</option></select></label>
          <label>Quality<select onchange="studioUpdateSetting('quality',this.value)">${['Draft','Standard','Presentation'].map(value => `<option${studio.settings.quality === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
          <label>Creativity<select onchange="studioUpdateSetting('creativity',this.value)">${['Conservative','Balanced','Bold'].map(value => `<option${studio.settings.creativity === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
          <label>Brand flexibility<select onchange="studioUpdateSetting('brandFlexibility',this.value)">${['Strict','Guided','Exploratory'].map(value => `<option${studio.settings.brandFlexibility === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
          <label>Text accuracy<select onchange="studioUpdateSetting('textAccuracy',this.value)">${['Low','Standard','High'].map(value => `<option${studio.settings.textAccuracy === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
          <label>Background<select onchange="studioUpdateSetting('background',this.value)">${['White studio','Road scene','Shop environment','Transparent','Custom'].map(value => `<option${studio.settings.background === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
          <label><input type="checkbox" ${studio.settings.includeExplanation ? 'checked' : ''} onchange="studioUpdateSetting('includeExplanation',this.checked)"> Include explanation</label>
          <label><input type="checkbox" ${studio.settings.includeTitle ? 'checked' : ''} onchange="studioUpdateSetting('includeTitle',this.checked)"> Include title</label>
        </div>
        <div id="studio-credit-estimate" class="studio-credit-estimate"><strong>${estimate.images} mockup image${estimate.images === 1 ? '' : 's'}</strong><span>Estimated local credit equivalent: ${estimate.credits}</span></div>
        <button type="button" class="studio-generate-btn" onclick="generateStudioConcepts(false)" ${studioGenerating ? 'disabled' : ''}><i class="fa-solid fa-microchip"></i>${studioGenerating ? 'Generating...' : 'Generate Concepts'}</button>
        <div id="studio-generation-state" class="studio-generation-state"></div>
        <div class="studio-safety-note"><i class="fa-solid fa-circle-info"></i><span>Concepts are not final production artwork. Text, exact logos, coverage, templates, measurements, panel breaks, bleed, and print files require professional design review.</span></div>
        <div class="studio-section-heading compact"><div><span>LOG</span><h4>Activity</h4></div></div><div class="studio-activity-list">${renderStudioActivity(studio)}</div>
      </aside>
    </div>

    ${renderStudioCompareTray(studio)}
    <section class="studio-gallery-section"><div class="studio-gallery-header"><div><span class="studio-eyebrow">RESULTS</span><h3>Concept Gallery</h3><p>Review internally, preserve versions, select directions, and send only chosen concepts to the portal.</p></div><div><button type="button" class="btn" onclick="studioCreateDesignerBrief()"><i class="fa-solid fa-file-circle-check"></i>Create Designer Brief</button><span>${studio.concepts.filter(concept => !concept.archived).length} active concepts</span></div></div><div class="studio-concept-grid">${renderStudioConceptCards(studio)}</div></section>

    <div id="studio-concept-edit-modal" class="studio-modal"><div class="studio-modal-card"><div class="studio-modal-header"><h3>Refine Concept Without Overwriting</h3><button type="button" onclick="closeStudioConceptEditor()">×</button></div><p>Choose or write an instruction. A new version will be created and the previous version will remain available.</p><div class="studio-quick-refinements">${['Make this cleaner','Make this bolder','Use more red','Use less red','Increase logo size','Move phone number higher','Add more negative space','Make it more premium','Make it easier to read from distance','Keep layout but change color direction','Keep colors but change layout','Generate opposite-side version'].map(instruction => `<button type="button" onclick="document.getElementById('studio-refinement-instruction').value='${instruction.replaceAll("'","\\'")}'">${instruction}</button>`).join('')}</div><textarea id="studio-refinement-instruction"></textarea><div class="studio-modal-actions"><button type="button" class="btn" onclick="closeStudioConceptEditor()">Cancel</button><button type="button" class="btn btn-primary" onclick="applyStudioConceptRefinement()">Create New Version</button></div></div></div>
  `;
  renderStudioReferencePreview(project);
}

function renderPortalConceptStudio(project = getActiveProject()) {
  const root = document.getElementById('portal-concept-studio-root');
  const section = document.getElementById('portal-sec-concepts');
  const badge = document.getElementById('portal-concepts-badge');
  if (!root || !section || !project) return;
  const studio = ensureMockupStudio(project);
  const concepts = studio.concepts.filter(concept => concept.sentToPortal && !concept.archived);
  section.style.display = 'block';
  badge.textContent = concepts.length ? `${concepts.length} Concept${concepts.length === 1 ? '' : 's'} Ready` : 'No Concepts Sent';
  badge.className = `badge ${concepts.length ? 'badge-quote' : 'badge-warning'}`;
  if (!concepts.length) {
    root.innerHTML = `<div class="portal-concept-disclaimer"><i class="fa-solid fa-circle-info"></i><div><strong>No AI concepts are currently shared.</strong><p>Your project team will send selected directions here when they are ready for discussion.</p></div></div>`;
    return;
  }
  root.innerHTML = `<div class="portal-concept-disclaimer"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>Preliminary AI-generated design concepts</strong><p>These images are preliminary AI-generated design concepts for direction and discussion. They are not final production artwork, final proof approval, print-ready files, or an exact representation of the completed vehicle wrap.</p></div></div><div class="portal-concept-grid">${concepts.map(concept => { const image = concept.images[concept.activeViewIndex] || concept.images[0]; return `<article class="portal-concept-card${concept.customer.selected ? ' selected' : ''}"><div class="portal-concept-image-shell" onclick="portalAddConceptAnnotation(event,'${concept.id}')"><img src="${image?.dataUrl || ''}" alt="Concept ${concept.number}"><canvas class="portal-markup-canvas" data-concept-id="${concept.id}"></canvas>${concept.customer.annotations.map((annotation,index) => `<button type="button" class="portal-annotation-pin" style="left:${annotation.x}%;top:${annotation.y}%" title="${studioEscape(annotation.note)}">${index + 1}</button>`).join('')}</div><div class="portal-concept-body"><div><span>Concept ${concept.number}</span><h4>${studioEscape(concept.title)}</h4><p>${studioEscape(concept.explanation)}</p></div><label class="portal-select-concept"><input type="checkbox" ${concept.customer.selected ? 'checked' : ''} onchange="portalToggleConceptSelection('${concept.id}',this.checked)">Select this direction</label><label>Rate concept<select onchange="portalUpdateConceptFeedback('${concept.id}','rating',this.value)"><option value="0">Not rated</option>${[1,2,3,4,5].map(rating => `<option value="${rating}"${Number(concept.customer.rating) === rating ? ' selected' : ''}>${rating} / 5</option>`).join('')}</select></label><div class="portal-feedback-tags">${STUDIO_FEEDBACK_TAGS.map(tag => `<button type="button" class="${concept.customer.feedbackTags.includes(tag) ? 'active' : ''}" onclick="portalToggleFeedbackTag('${concept.id}','${tag.replaceAll("'","\\'")}')">${tag}</button>`).join('')}</div><label>Comments<textarea placeholder="Tell the design team what to keep or change" onchange="portalUpdateConceptFeedback('${concept.id}','comment',this.value)">${studioEscape(concept.customer.comment)}</textarea></label><div class="portal-concept-actions"><button type="button" class="btn btn-small" onclick="portalToggleMarkup('${concept.id}')"><i class="fa-solid fa-pen-ruler"></i>${concept.customer.markupEnabled ? 'Finish Markup' : 'Draw / Mark Up'}</button><button type="button" class="btn btn-small" onclick="portalAskConceptQuestion('${concept.id}')"><i class="fa-solid fa-circle-question"></i>Ask a Question</button></div></div></article>`; }).join('')}</div><div class="portal-concept-footer"><button type="button" class="btn" onclick="portalRequestConceptChanges()">Request Changes</button><button type="button" class="btn btn-success" onclick="portalApproveConceptDirection()"><i class="fa-solid fa-check"></i>Approve Selected Direction</button><button type="button" class="btn" onclick="portalUploadStudioAsset('inspiration')"><i class="fa-solid fa-upload"></i>Upload Inspiration</button><button type="button" class="btn" onclick="portalUploadStudioAsset('logo')"><i class="fa-solid fa-upload"></i>Upload Corrected Logo</button></div>`;
  initializePortalMarkupCanvases(project);
}

function portalConcept(conceptId) {
  const project = getActiveProject();
  return project && ensureMockupStudio(project).concepts.find(concept => concept.id === conceptId);
}

function portalToggleConceptSelection(conceptId, checked) {
  const project = getActiveProject();
  const concept = portalConcept(conceptId);
  if (!project || !concept) return;
  concept.customer.selected = checked;
  ensureMockupStudio(project).status = 'Customer Feedback Received';
  studioLogActivity(project, `Customer ${checked ? 'selected' : 'unselected'} Concept ${concept.number}.`);
  renderPortalConceptStudio(project);
}

function portalUpdateConceptFeedback(conceptId, field, value) {
  const project = getActiveProject();
  const concept = portalConcept(conceptId);
  if (!project || !concept) return;
  concept.customer[field] = field === 'rating' ? Number(value) : value;
  ensureMockupStudio(project).status = 'Customer Feedback Received';
  studioLogActivity(project, `Customer updated ${field} for Concept ${concept.number}.`);
}

function portalToggleFeedbackTag(conceptId, tag) {
  const project = getActiveProject();
  const concept = portalConcept(conceptId);
  if (!project || !concept) return;
  const tags = concept.customer.feedbackTags;
  concept.customer.feedbackTags = tags.includes(tag) ? tags.filter(item => item !== tag) : [...tags, tag];
  studioLogActivity(project, `Customer feedback tag updated for Concept ${concept.number}: ${tag}.`);
  renderPortalConceptStudio(project);
}

function portalAddConceptAnnotation(event, conceptId) {
  const project = getActiveProject();
  const concept = portalConcept(conceptId);
  if (!project || !concept || concept.customer.markupEnabled || event.target.closest('.portal-annotation-pin')) return;
  const shell = event.currentTarget;
  const rect = shell.getBoundingClientRect();
  const note = prompt('Add a note at this point on the concept:');
  if (!note?.trim()) return;
  concept.customer.annotations.push({ id: studioUid('annotation'), x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100, note: note.trim(), createdAt: studioTimestamp() });
  studioLogActivity(project, `Customer added a pinned annotation to Concept ${concept.number}.`);
  renderPortalConceptStudio(project);
}

function portalToggleMarkup(conceptId) {
  const project = getActiveProject();
  const concept = portalConcept(conceptId);
  if (!project || !concept) return;
  concept.customer.markupEnabled = !concept.customer.markupEnabled;
  persistMockupStudio(project);
  renderPortalConceptStudio(project);
}

function initializePortalMarkupCanvases(project) {
  document.querySelectorAll('.portal-markup-canvas').forEach(canvas => {
    const concept = portalConcept(canvas.dataset.conceptId);
    const shell = canvas.parentElement;
    canvas.width = Math.max(1, Math.round(shell.clientWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(shell.clientHeight * devicePixelRatio));
    canvas.style.pointerEvents = concept?.customer.markupEnabled ? 'auto' : 'none';
    const ctx = canvas.getContext('2d');
    ctx.scale(devicePixelRatio, devicePixelRatio);
    if (concept?.customer.markupDataUrl) {
      const saved = new Image();
      saved.onload = () => ctx.drawImage(saved, 0, 0, shell.clientWidth, shell.clientHeight);
      saved.src = concept.customer.markupDataUrl;
    }
    if (!concept?.customer.markupEnabled) return;
    let drawing = false;
    const point = event => ({ x: event.offsetX, y: event.offsetY });
    canvas.onpointerdown = event => { drawing = true; const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); canvas.setPointerCapture(event.pointerId); };
    canvas.onpointermove = event => { if (!drawing) return; const p = point(event); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(); };
    canvas.onpointerup = () => { drawing = false; concept.customer.markupDataUrl = canvas.toDataURL('image/png'); studioLogActivity(project, `Customer markup saved for Concept ${concept.number}.`); };
  });
}

function portalAskConceptQuestion(conceptId) {
  const project = getActiveProject();
  const concept = portalConcept(conceptId);
  const question = prompt('What would you like to ask the design team?');
  if (!project || !concept || !question?.trim()) return;
  project.chatHistory.push({ sender: 'customer', text: `Concept ${concept.number} question: ${question.trim()}`, time: new Date().toISOString().replace('T', ' ').substring(0, 16) });
  studioLogActivity(project, `Customer asked a question about Concept ${concept.number}.`);
}

function portalRequestConceptChanges() {
  const project = getActiveProject();
  if (!project) return;
  const studio = ensureMockupStudio(project);
  studio.status = 'Customer Feedback Received';
  studioLogActivity(project, 'Customer requested changes to the shared concept batch.');
  alert('Change request recorded. Your selections, ratings, comments, pins, and markup remain attached to the concepts.');
}

function portalApproveConceptDirection() {
  const project = getActiveProject();
  const studio = project && ensureMockupStudio(project);
  const selected = studio?.concepts.filter(concept => concept.sentToPortal && concept.customer.selected);
  if (!project || !selected?.length) {
    alert('Select at least one concept direction first.');
    return;
  }
  studio.status = 'Concept Direction Selected';
  const task = { id: studioUid('task'), title: 'Create Professional Production Design Based on Selected Concept and Customer Notes', status: 'Open', createdAt: studioTimestamp(), conceptIds: selected.map(concept => concept.id) };
  studio.designerTasks.push(task);
  selected.forEach(concept => { concept.selected = true; });
  studioLogActivity(project, `Customer selected concept direction(s) ${selected.map(concept => concept.number).join(', ')}. Designer production task created.`);
  alert('Concept direction selected. This is not final artwork approval. A professional production-design task has been created.');
  renderPortalConceptStudio(project);
}

function portalUploadStudioAsset(kind) {
  const project = getActiveProject();
  if (!project) return;
  const studio = ensureMockupStudio(project);
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,.svg,.pdf,.eps,.ai';
  input.onchange = async event => {
    const file = event.target.files?.[0];
    if (!file || file.size > 8 * 1024 * 1024) return;
    const dataUrl = await readStudioFile(file);
    const inspection = await inspectStudioImage(dataUrl);
    const type = kind === 'logo' ? 'Logo' : 'Style Inspiration';
    const protection = kind === 'logo' ? 'Must Stay Exact' : 'Inspiration Only';
    const asset = { id: studioUid('asset'), ref: studioNextReference(studio, type), name: file.name, type, protection, note: 'Uploaded by customer portal', uploadedAt: studioTimestamp(), mimeType: file.type, size: file.size, dataUrl, width: inspection.width, height: inspection.height, qualityWarning: inspection.warning };
    studio.assets.push(asset);
    studioLogActivity(project, `Customer uploaded ${asset.ref} (${file.name}) as ${type}.`);
    alert(`${asset.ref} uploaded and attached to the project.`);
  };
  input.click();
}
