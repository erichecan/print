const prisma = require('../lib/prisma');
const { getCache, setCache } = require('../config/redis');

const CACHE_TTL = 300;
const CACHE_KEY = 'tag_groups:all';

async function listTagGroups(req, res) {
  try {
    const cached = await getCache(CACHE_KEY);
    if (cached) return res.json(cached);

    const groups = await prisma.tagGroup.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    await setCache(CACHE_KEY, groups, CACHE_TTL);
    res.json(groups);
  } catch (err) {
    console.error('[tagGroupController.listTagGroups]', err);
    res.status(500).json({ error: 'Failed to fetch tag groups' });
  }
}

async function getTagGroup(req, res) {
  try {
    const { id } = req.params;
    const group = await prisma.tagGroup.findUnique({ where: { id } });
    if (!group) return res.status(404).json({ error: 'Not found' });
    res.json(group);
  } catch (err) {
    console.error('[tagGroupController.getTagGroup]', err);
    res.status(500).json({ error: 'Failed to fetch tag group' });
  }
}

async function createTagGroup(req, res) {
  try {
    const { name, slug, tags, sortOrder, isActive } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });

    const group = await prisma.tagGroup.create({
      data: {
        name,
        slug,
        tags: tags ?? [],
        sortOrder: sortOrder ?? 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    await setCache(CACHE_KEY, null, 0); // invalidate
    res.status(201).json(group);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    console.error('[tagGroupController.createTagGroup]', err);
    res.status(500).json({ error: 'Failed to create tag group' });
  }
}

async function updateTagGroup(req, res) {
  try {
    const { id } = req.params;
    const { name, slug, tags, sortOrder, isActive } = req.body;

    const group = await prisma.tagGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(tags !== undefined && { tags }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    await setCache(CACHE_KEY, null, 0); // invalidate
    res.json(group);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    console.error('[tagGroupController.updateTagGroup]', err);
    res.status(500).json({ error: 'Failed to update tag group' });
  }
}

async function deleteTagGroup(req, res) {
  try {
    const { id } = req.params;
    await prisma.tagGroup.delete({ where: { id } });
    await setCache(CACHE_KEY, null, 0); // invalidate
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    console.error('[tagGroupController.deleteTagGroup]', err);
    res.status(500).json({ error: 'Failed to delete tag group' });
  }
}

module.exports = {
  listTagGroups,
  getTagGroup,
  createTagGroup,
  updateTagGroup,
  deleteTagGroup,
};
