import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanSequence,
  cleanDnaSequence,
  smithWatermanAlign,
  needlemanWunschAlign,
  predictRnaSecondaryStructure,
  screenLncRnaProteinInteraction,
  screenLncRnaMiRnaInteraction,
  screenLncRnaDnaTriplex,
  calculateEarlyBioticStressIndex,
} from './bioCalculations';

test('cleanSequence converts DNA T to RNA U and removes invalid chars', () => {
  assert.equal(cleanSequence('atgc-123xyz'), 'AUGC');
  assert.equal(cleanDnaSequence('atgc-123xyz'), 'ATGC');
});

test('Smith-Waterman performs local alignment accurately', () => {
  const seq1 = 'GGGAUCAUGCAUGC';
  const seq2 = 'AUCAUGC';
  const result = smithWatermanAlign(seq1, seq2);
  assert.ok(result.score > 0);
  assert.ok(result.identityPercent >= 90);
  assert.equal(result.gaps, 0);
});

test('Needleman-Wunsch performs global alignment accurately', () => {
  const seq1 = 'AUGCAUGC';
  const seq2 = 'AUGCAUGC';
  const result = needlemanWunschAlign(seq1, seq2);
  assert.equal(result.identityPercent, 100);
  assert.equal(result.gaps, 0);
});

test('predictRnaSecondaryStructure generates valid dot-bracket notation', () => {
  // A small hairpin sequence: GGGAAACCC
  const hairpin = 'GGGAAACCC';
  const res = predictRnaSecondaryStructure(hairpin);
  assert.equal(res.sequence, hairpin);
  assert.equal(res.dotBracket.length, hairpin.length);
  // Equal number of open and closed brackets
  const openCount = (res.dotBracket.match(/\(/g) || []).length;
  const closeCount = (res.dotBracket.match(/\)/g) || []).length;
  assert.equal(openCount, closeCount);
  assert.ok(openCount > 0);
});

test('screenLncRnaProteinInteraction detects RRM motifs and calculates propensity', () => {
  const lncRna = 'GGGAUCAUGCAUGCGCUAGCUAGCUAGCUAGCUAGC';
  // Protein containing canonical RRM RNP1 motif: RGFGFV
  const protein = 'MKVVVRGFGFVEELLKKLAKRKK';
  const res = screenLncRnaProteinInteraction(lncRna, protein, 'TestRRMProtein');
  assert.ok(res.score > 0.4);
  assert.ok(res.bindingPropensity >= 40);
  assert.ok(res.detectedRnaBindingMotifs.length > 0);
});

test('screenLncRnaMiRnaInteraction detects seed matches and evaluates ceRNA sponging', () => {
  // miRNA seed: positions 2-8 is 'GAGGUAG'. Reverse complement in lncRNA: 'CUACCUC'
  const mirSeq = 'UGAGGUAGUAGGUUGUAUAGUU'; // osa-miR168
  const lncRna = 'AAAAACUACCUCAAAAAAAA';
  const res = screenLncRnaMiRnaInteraction(lncRna, mirSeq, 'osa-miR168');
  assert.ok(res.length > 0);
  assert.ok(res[0].spongingEfficiency > 50);
  assert.ok(res[0].freeEnergyKcal < 0);
});

test('screenLncRnaDnaTriplex detects Hoogsteen pyrimidine binding motifs', () => {
  const lncRna = 'UUUUUCCCCCCUUUUUU'; // polypyrimidine
  const dnaPromoter = 'AAAAAGGGGGGAAAAAA'; // polypurine target
  const res = screenLncRnaDnaTriplex(lncRna, dnaPromoter);
  assert.ok(res.length > 0);
  assert.equal(res[0].motifType, 'Parallel (Pyrimidine)');
  assert.ok(res[0].triplexScore >= 70);
});

test('calculateEarlyBioticStressIndex reflects thermal and stomatal dynamics', () => {
  // Healthy baseline:
  const healthy = calculateEarlyBioticStressIndex(0, 0.1, -2.2, 420);
  assert.equal(healthy.stressPhase, 'Normal / Baseline');
  assert.equal(healthy.pathogenRiskLevel, 'Negligible');

  // Early pathogen invasion: stomata closed (gs drops to 120), leaf warms up (DeltaT = +1.2 C), lncRNA induced (Log2FC = +2.4)
  const earlyInfection = calculateEarlyBioticStressIndex(12, 2.4, 1.2, 120);
  assert.ok(earlyInfection.ebsdiScore > 60);
  assert.ok(earlyInfection.stressPhase === 'Active Defense / Signaling' || earlyInfection.stressPhase === 'Symptomatic / Advanced');
});

test('compareQueryAgainstTemplates computes multi-template homology matrix', async () => {
  const { compareQueryAgainstTemplates } = await import('./bioCalculations');
  const query = 'GGGAUCUCCUGCAUGCGCUAGCUAGCUAGCUGACUGACUGACU';
  const templates = [
    {
      id: 'tmpl1',
      name: 'ALEX1',
      species: 'Oryza sativa',
      speciesCommon: 'Rice',
      pathogen: 'Xoo',
      pathogenType: 'Bacterium',
      category: 'Crop Defense',
      primaryTarget: 'OsJAZ1',
      sequence: 'GGGAUCUCCUGCAUGCGCUAGCUAGCUAGCUGACUGACUGACU', // exact match
    },
    {
      id: 'tmpl2',
      name: 'Divergent',
      species: 'Arabidopsis',
      speciesCommon: 'Thale Cress',
      pathogen: 'Pst',
      pathogenType: 'Bacterium',
      category: 'Model Plant',
      primaryTarget: 'AtPR1',
      sequence: 'UUUUUUUCCCCCCAAAAAA',
    },
  ];

  const results = compareQueryAgainstTemplates(query, templates);
  assert.equal(results.length, 2);
  assert.equal(results[0].alignment.identityPercent, 100);
  assert.equal(results[0].confidenceTier, 'High Homology');
  assert.ok(results[0].compositeHomologyScore >= 80);
});

test('generateDotPlotMatrix identifies diagonal match coordinates', async () => {
  const { generateDotPlotMatrix } = await import('./bioCalculations');
  const seq1 = 'AUGCAUGCGCUAGCUAGCUAGCUGACU';
  const seq2 = 'AUGCAUGCGCUAGCUAGCUAGCUGACU';
  const dotPlot = generateDotPlotMatrix(seq1, seq2, 5, 4);
  assert.ok(dotPlot.matches.length > 0);
  // Diagonal matches where x is close to y
  const diagonalMatches = dotPlot.matches.filter((m) => Math.abs(m.x - m.y) <= 1);
  assert.ok(diagonalMatches.length > 0);
});

test('sequenceValidator enforces strict A, C, G, T, U regex and identifies invalid characters', async () => {
  const { validateLncRnaSequence, sanitizeToRnaSequence } = await import('./sequenceValidator');

  // Valid RNA sequence
  const valid = validateLncRnaSequence('AUGCAUGCACGU');
  assert.equal(valid.isValid, true);
  assert.equal(valid.totalInvalidCount, 0);
  assert.equal(valid.length, 12);
  assert.equal(valid.composition.gcPercent, 50);

  // Valid with FASTA header and whitespace and T (DNA)
  const fasta = `>ALEX1_Oryza_sativa\naugc augc\natgc atgc`;
  const validFasta = validateLncRnaSequence(fasta);
  assert.equal(validFasta.isValid, true);
  assert.equal(validFasta.header, 'ALEX1_Oryza_sativa');
  assert.equal(validFasta.cleanedSequence.includes('T'), false); // T converted to U

  // Invalid with non-nucleotide characters: X, 9, @
  const invalid = validateLncRnaSequence('AUGCX123@UGC');
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.totalInvalidCount >= 4);
  const invalidChars = invalid.invalidChars.map((c) => c.char);
  assert.ok(invalidChars.includes('X'));
  assert.ok(invalidChars.includes('@'));
  assert.ok(invalid.errorMessage !== null);

  // Sanitize strips invalid chars
  const sanitized = sanitizeToRnaSequence('AUGCX123@TGC');
  assert.equal(sanitized, 'AUGCUGC');
});

test('thermodynamics nearest-neighbor calculates RNA melting temperature accurately', async () => {
  const { calculateNearestNeighborTm, calculateSlidingWindowTm } = await import('./thermodynamics');

  // Standard hairpin sequence: GGGAAACCC (GC-rich stem)
  const hairpin = 'GGGAAACCC';
  const thermo = calculateNearestNeighborTm(hairpin, 0.1, 0.0015, 1e-6, true);
  assert.ok(thermo.meltingTemperatureTm > 0);
  assert.ok(thermo.saltAdjustedTm > 20);
  assert.ok(thermo.gcContentPercent > 60);
  assert.ok(thermo.enthalpyDeltaH < 0); // Exothermic duplex formation
  assert.ok(thermo.entropyDeltaS < 0);

  // Higher salt concentration increases salt-adjusted Tm
  const highSalt = calculateNearestNeighborTm(hairpin, 0.5, 0.005, 1e-6, true);
  assert.ok(highSalt.saltAdjustedTm >= thermo.saltAdjustedTm);

  // Sliding window Tm profile
  const profile = calculateSlidingWindowTm('GGGAAACCCGGGAAACCC', 9, 3);
  assert.ok(profile.length > 0);
  assert.ok(profile[0].tm > 0);
});


