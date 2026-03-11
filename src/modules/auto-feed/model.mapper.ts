import { Injectable } from '@nestjs/common';
import { AnnouncementStatus, AnnouncementType } from '../announcements/schemas/announcement.schema';
import { EventStatus } from '../event/schema/event.schema';
import { SurveyStatus } from '../surveys/enums/survey-status.enum';
import { DailyJournalStatus } from '../daily-journal/schemas/daily-journal.schema';
import { BreakfastStatus } from '../breakfast/schemas/breakfast.schema';
import { GroveCurriculumStatus } from '../grove-curriculum/schemas/grove-curriculum.schema';
import { YearReportStatus } from '../year-report/schemas/year-report.schema';
import { LearningJourneyStatus } from '../learning-journey/schemas/learning-journey.schema';

type Action = 'create' | 'update' | 'delete' | 'archive';

export interface FeedPayload {
  type:
    | 'announcement'
    | 'event'
    | 'poll'
    | 'survey'
    | 'daily-journal'
    | 'breakfast'
    | 'grove-curriculum'
    | 'year-report'
    | 'learning-journey'
  refId: string;
  title: string;
  description?: string;
  isForAllCampuses: boolean;
  campuses: string[];
  visibleFrom?: string | null;
  visibleUntil?: string | null;
  mediaUrls?: string[];
  isPinned?: boolean;
  status?: 'active' | 'archived';
}

@Injectable()
export class ModelMapper {
  toFeedPayload(type: FeedPayload['type'], entity: any, action: Action): FeedPayload | null {
    if (!entity) return null;
    const entityId = entity._id || entity.id;
    if (!entityId) return null;
    switch (type) {
      case 'announcement':
        return this.fromAnnouncement(entity, action);
      case 'event':
        return this.fromEvent(entity, action);
      case 'poll':
        return this.fromPoll(entity, action);
      case 'survey':
        return this.fromSurvey(entity, action);
      case 'daily-journal':
        return this.fromDailyJournal(entity, action);
      case 'breakfast':
        return this.fromBreakfast(entity, action);
      case 'grove-curriculum':
        return this.fromGroveCurriculum(entity, action);
      case 'year-report':
        return this.fromYearReport(entity, action);
      case 'learning-journey':
        return this.fromLearningJourney(entity, action);
    }
  }

  private fromAnnouncement(a: any, action: Action): FeedPayload | null {
    if (!a || !a._id) return null;
    const statusStr = String(a.status || '').toLowerCase();
    const published = statusStr === String(AnnouncementStatus.PUBLISHED).toLowerCase();
    if (action === 'create' && !published) return null;
    const scope = (a.scope || a?.scope?.toString?.() || '').toLowerCase();
    const isForAll = scope === 'all';
    const campusIds = isForAll ? [] : (a.campuses || []).map((c: any) => String(c?._id || c));
    return {
      type:
        a.type === AnnouncementType.EVENT ||
        String(a.type || '').toLowerCase() === String(AnnouncementType.EVENT).toLowerCase()
          ? 'event'
          : 'announcement',
      refId: String(a._id || a.id),
      title: a.title,
      description: a.shortDescription || a.content || '',
      isForAllCampuses: isForAll,
      campuses: campusIds,
      mediaUrls: a.images || [],
      visibleFrom: a.startDate ? new Date(a.startDate).toISOString() : null,
      visibleUntil: a.endDate ? new Date(a.endDate).toISOString() : null,
      isPinned: Boolean(a.isPinned),
      status: published ? 'active' : 'archived',
    };
  }

  private fromEvent(e: any, action: Action): FeedPayload | null {
    if (!e || !e._id) return null;
    const published = e.status === EventStatus.PUBLISHED || e.status === 'Published' || e.status === 'PUBLISHED';
    if (action === 'create' && !published) return null;
    const campuses = Array.isArray(e.campus) ? e.campus : (e.campus ? [e.campus] : []);
    const campusIds = campuses.map((c: any) => String(c?._id || c));
    const from = e.startDate ? new Date(e.startDate) : null;
    const until = e.endDate ? new Date(e.endDate) : (e.startDate ? new Date(e.startDate) : null);
    if (from) from.setHours(0, 0, 0, 0);
    if (until) until.setHours(23, 59, 59, 999);
    return {
      type: 'event',
      refId: String(e._id || e.id),
      title: e.title,
      description: e.shortDescription || e.content || '',
      isForAllCampuses: campusIds.length === 0,
      campuses: campusIds,
      visibleFrom: from ? from.toISOString() : null,
      visibleUntil: until ? until.toISOString() : null,
      mediaUrls: e.bannerUrl ? [e.bannerUrl] : [],
      status: published ? 'active' : 'archived',
    };
  }

  private fromPoll(p: any, action: Action): FeedPayload | null {
    if (!p || !p._id) return null;
    const active = p.status === 'active';
    if (action === 'create' && !active) return null;
    const campusIds = (p.campuses || []).map((c: any) => String(c?._id || c));
    return {
      type: 'poll',
      refId: String(p._id || p.id),
      title: p.title,
      description: `New poll: ${p.title}. Share your opinion!`,
      isForAllCampuses: p.isForAllCampuses || campusIds.length === 0,
      campuses: campusIds,
      visibleFrom: p.pollDate ? new Date(p.pollDate).toISOString() : null,
      visibleUntil: null,
      status: active ? 'active' : 'archived',
    };
  }

  private fromSurvey(s: any, action: Action): FeedPayload | null {
    if (!s || !s._id) return null;
    const published = s.status === SurveyStatus.PUBLISH || s.status === 'PUBLISH';
    if (action === 'create' && !published) return null;
    const campusIds = (s.campuses || []).map((c: any) => String(c?._id || c));
    return {
      type: 'survey',
      refId: String(s._id || s.id),
      title: s.title,
      description: `New survey: ${s.title}. Share your opinion!`,
      isForAllCampuses: campusIds.length === 0,
      campuses: campusIds,
      visibleFrom: s.scheduledDate ? new Date(s.scheduledDate).toISOString() : null,
      visibleUntil: null,
      status: published ? 'active' : 'archived',
    };
  }

  private fromDailyJournal(dj: any, action: Action): FeedPayload | null {
    if (!dj || !dj._id) return null;
    const published =
      dj.status === DailyJournalStatus.PUBLISH || dj.status === 'Publish' || dj.status === 'PUBLISH';
    if (action === 'create' && !published) return null;
    const campusId = dj.campus ? String(dj.campus?._id || dj.campus) : undefined;
    const visibleFromDate = dj.publishedDate || dj.date;
    return {
      type: 'daily-journal',
      refId: String(dj._id || dj.id),
      title: dj.title || 'Daily Journal',
      description: dj.description || '',
      isForAllCampuses: !campusId,
      campuses: campusId ? [campusId] : [],
      visibleFrom: visibleFromDate ? new Date(visibleFromDate).toISOString() : null,
      visibleUntil: null,
      mediaUrls: dj.photos || [],
      status: published ? 'active' : 'archived',
    };
  }

  private fromBreakfast(b: any, action: Action): FeedPayload | null {
    if (!b || !b._id) return null;
    const published =
      b.status === BreakfastStatus.PUBLISHED || b.status === 'Published' || b.status === 'PUBLISHED';
    if (action === 'create' && !published) return null;
    const campusId = b.campus ? String(b.campus?._id || b.campus) : undefined;
    const visibleFromDate = b.publishedDate || b.date;
    const childrenCount = Array.isArray(b.childrenEntries) ? b.childrenEntries.length : 0;
    const description = childrenCount > 0 
      ? `Breakfast record for ${childrenCount} ${childrenCount === 1 ? 'child' : 'children'}`
      : 'Breakfast record';
    return {
      type: 'breakfast',
      refId: String(b._id || b.id),
      title: `Breakfast - ${b.date ? new Date(b.date).toLocaleDateString() : 'Record'}`,
      description,
      isForAllCampuses: !campusId,
      campuses: campusId ? [campusId] : [],
      visibleFrom: visibleFromDate ? new Date(visibleFromDate).toISOString() : null,
      visibleUntil: null,
      mediaUrls: [],
      status: published ? 'active' : 'archived',
    };
  }

  private fromGroveCurriculum(gc: any, action: Action): FeedPayload | null {
    if (!gc || !gc._id) return null;
    const published =
      gc.status === GroveCurriculumStatus.PUBLISH || gc.status === 'Publish' || gc.status === 'PUBLISH';
    if (action === 'create' && !published) return null;
    const campusId = gc.campus ? String(gc.campus?._id || gc.campus) : undefined;
    const monthYear = gc.month && gc.year ? `${gc.month} ${gc.year}` : 'Curriculum';
    return {
      type: 'grove-curriculum',
      refId: String(gc._id || gc.id),
      title: `Grove Curriculum - ${monthYear}`,
      description: `Grove Curriculum for ${monthYear}`,
      isForAllCampuses: !campusId,
      campuses: campusId ? [campusId] : [],
      visibleFrom: gc.createdAt ? new Date(gc.createdAt).toISOString() : null,
      visibleUntil: null,
      mediaUrls: [],
      status: published ? 'active' : 'archived',
    };
  }

  private fromYearReport(yr: any, action: Action): FeedPayload | null {
    if (!yr || !yr._id) return null;
    const published =
      yr.status === YearReportStatus.PUBLISHED || yr.status === 'Published' || yr.status === 'PUBLISHED';
    if (action === 'create' && !published) return null;
    const campusId = yr.campus ? String(yr.campus?._id || yr.campus) : undefined;
    const childName = yr.children?.fullName || '';
    const dateLabel = yr.date ? new Date(yr.date).toLocaleDateString() : '';
    const titleParts = ['Year Report'];
    if (childName) {
      titleParts.push(`- ${childName}`);
    }
    if (dateLabel) {
      titleParts.push(`(${dateLabel})`);
    }
    const title = titleParts.join(' ');
    const description = yr.developmentalSummary || yr.goalEvaluation || '';
    const visibleFrom = yr.date || yr.createdAt;
    return {
      type: 'year-report',
      refId: String(yr._id || yr.id),
      title,
      description,
      isForAllCampuses: !campusId,
      campuses: campusId ? [campusId] : [],
      visibleFrom: visibleFrom ? new Date(visibleFrom).toISOString() : null,
      visibleUntil: null,
      mediaUrls: [],
      status: published ? 'active' : 'archived',
    };
  }

  private fromLearningJourney(lj: any, action: Action): FeedPayload | null {
    if (!lj || !lj._id) return null;
    const published =
      lj.status === LearningJourneyStatus.PUBLISHED ||
      lj.status === 'Published' ||
      lj.status === 'PUBLISHED';
    if (action === 'create' && !published) return null;
    const campusId = lj.campus ? String(lj.campus?._id || lj.campus) : undefined;
    const childName = lj.children?.fullName || '';
    const dateLabel = lj.date ? new Date(lj.date).toLocaleDateString() : '';
    const titleParts = ['Learning Journey'];
    if (childName) {
      titleParts.push(`- ${childName}`);
    }
    if (dateLabel) {
      titleParts.push(`(${dateLabel})`);
    }
    const title = titleParts.join(' ');
    const description =
      lj.newStrengths ||
      lj.newInterests ||
      (Array.isArray(lj.newGoals) ? lj.newGoals.join('\n') : '') ||
      '';
    const visibleFrom = lj.publishedDate || lj.date || lj.createdAt;
    return {
      type: 'learning-journey',
      refId: String(lj._id || lj.id),
      title,
      description,
      isForAllCampuses: !campusId,
      campuses: campusId ? [campusId] : [],
      visibleFrom: visibleFrom ? new Date(visibleFrom).toISOString() : null,
      visibleUntil: null,
      mediaUrls: [],
      status: published ? 'active' : 'archived',
    };
  }
}


