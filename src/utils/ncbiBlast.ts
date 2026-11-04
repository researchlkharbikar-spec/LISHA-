/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA NCBI BLAST Integration Utility
 * Generates formatted queries and submission forms for NCBI Nucleotide BLAST (blastn).
 */

export interface NcbiBlastPayload {
  fasta: string;
  cleanSeq: string;
  url: string;
}

/**
 * Prepares a sequence for NCBI Nucleotide BLAST (blastn).
 * Converts RNA Uracil ('U') to Thymine ('T') for standard NCBI nucleotide collection searching.
 */
export function formatSeqForBlast(sequence: string, name = 'lncRNA_Query'): NcbiBlastPayload {
  const cleanSeq = (sequence || '')
    .toUpperCase()
    .replace(/[^ACGUTacgut]/g, '')
    .replace(/U/g, 'T');

  const safeName = (name || 'lncRNA_Query')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'lncRNA_Query';

  const fasta = `>${safeName} | Length: ${cleanSeq.length} nt | LISHA Computational Platform\n${cleanSeq}`;

  const encodedFasta = encodeURIComponent(fasta);
  const url = `https://blast.ncbi.nlm.nih.gov/Blast.cgi?PROGRAM=blastn&PAGE=MegaBlast&QUERY=${encodedFasta}`;

  return { fasta, cleanSeq, url };
}

/**
 * Builds the direct GET URL for NCBI BLAST with pre-filled sequence.
 */
export function buildNcbiBlastUrl(sequence: string, name = 'lncRNA_Query'): string {
  return formatSeqForBlast(sequence, name).url;
}

/**
 * Opens NCBI Nucleotide BLAST in a new tab with the sequence pre-filled.
 * Uses a programmatic POST form with target="_blank" to avoid URL length limitations
 * and avoid window.open (safe for iframe environments).
 */
export function submitNcbiBlast(sequence: string, name = 'lncRNA_Query'): void {
  if (typeof document === 'undefined') return;

  const { fasta } = formatSeqForBlast(sequence, name);
  if (!fasta) return;

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://blast.ncbi.nlm.nih.gov/Blast.cgi';
  form.target = '_blank';
  form.rel = 'noopener noreferrer';
  form.style.display = 'none';

  const programInput = document.createElement('input');
  programInput.type = 'hidden';
  programInput.name = 'PROGRAM';
  programInput.value = 'blastn';
  form.appendChild(programInput);

  const pageInput = document.createElement('input');
  pageInput.type = 'hidden';
  pageInput.name = 'PAGE';
  pageInput.value = 'MegaBlast';
  form.appendChild(pageInput);

  const queryInput = document.createElement('input');
  queryInput.type = 'hidden';
  queryInput.name = 'QUERY';
  queryInput.value = fasta;
  form.appendChild(queryInput);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}
