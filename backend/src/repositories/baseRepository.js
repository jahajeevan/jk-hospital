export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  findById(id, projection = undefined, options = {}) {
    return this.model.findById(id, projection, options);
  }

  find(filter = {}, projection = undefined, options = {}) {
    return this.model.find(filter, projection, options);
  }

  paginate(filter = {}, { page = 1, limit = 20, sort = { createdAt: -1 }, populate = [] } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const query = this.model
      .find(filter)
      .sort(sort)
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);
    populate.forEach((item) => query.populate(item));
    return Promise.all([query, this.model.countDocuments(filter)]).then(([items, total]) => ({
      items,
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit)
    }));
  }
}

