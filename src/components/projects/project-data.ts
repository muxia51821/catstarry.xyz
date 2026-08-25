import projectEntries from '../../data/projects/index.json';
import {
  isCredentialFreeHttpsUrl,
  isIsoCalendarDate,
  selectVisibleProjects,
} from '../../lib/project-selection.mjs';
import { SLUG_PATTERN } from '../../../shared/slug';

export interface ProjectIndexEntry {
  projectId: string;
  name: string;
  description: string;
  url: string;
  screenshot: string;
  screenshotUrl?: string;
  tags: string[];
  date: string;
  visibility: 'public' | 'draft';
  updateId?: string;
}

export const PROJECTS = validateProjectIndex(projectEntries);

export function getVisibleProjects(entries: ProjectIndexEntry[] = PROJECTS) {
  return selectVisibleProjects(entries) as ProjectIndexEntry[];
}

function validateProjectIndex(entries: unknown): ProjectIndexEntry[] {
  if (!Array.isArray(entries)) throw new Error('Project index must be an array');
  const ids = new Set<string>();
  const updates = new Set<string>();
  return entries.map((value, index) => {
    if (!value || typeof value !== 'object') throw new Error(`Project ${index} must be an object`);
    const entry = value as Partial<ProjectIndexEntry>;
    if (!entry.projectId || !SLUG_PATTERN.test(entry.projectId) || ids.has(entry.projectId)) {
      throw new Error(`Project ${index} has an invalid or duplicate projectId`);
    }
    ids.add(entry.projectId);
    if (!entry.name?.trim() || !entry.description?.trim()) throw new Error(`Project ${entry.projectId} needs name and description`);
    if (!isCredentialFreeHttpsUrl(entry.url)) throw new Error(`Project ${entry.projectId} needs a credential-free HTTPS URL`);
    if (entry.screenshot && !/^\/assets\/projects\/[a-z0-9-]+\.(?:webp|png|jpe?g)$/.test(entry.screenshot)) {
      throw new Error(`Project ${entry.projectId} has an invalid screenshot path`);
    }
    if (entry.screenshotUrl && !isCredentialFreeHttpsUrl(entry.screenshotUrl)) {
      throw new Error(`Project ${entry.projectId} has an invalid screenshotUrl`);
    }
    if (!Array.isArray(entry.tags) || entry.tags.length === 0 || entry.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) {
      throw new Error(`Project ${entry.projectId} needs non-empty tags`);
    }
    if (!isIsoCalendarDate(entry.date)) {
      throw new Error(`Project ${entry.projectId} has an invalid date`);
    }
    if (entry.visibility !== 'public' && entry.visibility !== 'draft') {
      throw new Error(`Project ${entry.projectId} has an invalid visibility`);
    }
    if (entry.updateId) {
      if (!SLUG_PATTERN.test(entry.updateId) || updates.has(entry.updateId)) {
        throw new Error(`Project ${entry.projectId} has an invalid or duplicate updateId`);
      }
      updates.add(entry.updateId);
    }
    return entry as ProjectIndexEntry;
  });
}
