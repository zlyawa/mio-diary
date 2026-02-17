const prisma = require('../config/database');

/**
 * 构建分类树结构
 * @param {Array} categories - 扁平分类列表
 * @param {String|null} parentId - 父分类ID
 * @param {Number} level - 当前层级
 * @returns {Array} 树形结构分类列表
 */
const buildCategoryTree = (categories, parentId = null, level = 0) => {
  if (level >= 3) return []; // 限制3级嵌套

  return categories
    .filter(cat => cat.parentId === parentId)
    .map(cat => ({
      ...cat,
      level,
      children: buildCategoryTree(categories, cat.id, level + 1),
    }));
};

/**
 * 获取所有子分类ID（包括自身）
 * @param {Array} categories - 所有分类
 * @param {String} categoryId - 分类ID
 * @returns {Array} 所有子分类ID数组
 */
const getAllChildrenIds = (categories, categoryId) => {
  const result = [categoryId];
  const children = categories.filter(cat => cat.parentId === categoryId);
  
  for (const child of children) {
    result.push(...getAllChildrenIds(categories, child.id));
  }
  
  return result;
};

/**
 * 检查是否会造成循环引用
 * @param {Array} categories - 所有分类
 * @param {String} categoryId - 当前分类ID
 * @param {String} targetParentId - 目标父分类ID
 * @returns {Boolean} 是否会造成循环
 */
const wouldCreateCycle = (categories, categoryId, targetParentId) => {
  if (!targetParentId) return false;
  if (targetParentId === categoryId) return true;
  
  // 检查目标父分类是否是当前分类的子分类
  const parent = categories.find(cat => cat.id === targetParentId);
  if (!parent) return false;
  
  return wouldCreateCycle(categories, categoryId, parent.parentId);
};

/**
 * 获取分类树
 * GET /api/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 获取用户所有分类
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { diaries: true },
        },
      },
    });

    // 构建树形结构
    const categoryTree = buildCategoryTree(categories);

    // 添加日记数量到树形结构
    const addDiaryCount = (tree) => {
      return tree.map(cat => ({
        ...cat,
        diaryCount: cat._count.diaries,
        _count: undefined,
        children: addDiaryCount(cat.children),
      }));
    };

    res.json({
      categories: addDiaryCount(categoryTree),
      flatCategories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId,
        color: cat.color,
        diaryCount: cat._count.diaries,
      })),
    });
  } catch (error) {
    console.error('[获取分类错误]', error);
    next(error);
  }
};

/**
 * 创建分类
 * POST /api/categories
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, parentId, color } = req.body;
    const userId = req.user.id;

    // 验证名称
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '分类名称不能为空',
      });
    }

    const trimmedName = name.trim();

    if (trimmedName.length > 50) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '分类名称最多50个字符',
      });
    }

    // 验证颜色格式
    const trimmedColor = color?.trim() || null;
    if (trimmedColor && !/^#[0-9A-Fa-f]{6}$/.test(trimmedColor)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '颜色格式不正确，应为 #RRGGBB 格式',
      });
    }

    // 检查父分类是否存在且属于当前用户
    if (parentId) {
      const parentCategory = await prisma.category.findFirst({
        where: { id: parentId, userId },
        include: {
          parent: {
            include: {
              parent: true,
            },
          },
        },
      });

      if (!parentCategory) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: '父分类不存在',
        });
      }

      // 检查父分类层级（限制3级）
      let level = 1;
      let current = parentCategory;
      while (current.parent) {
        level++;
        current = current.parent;
      }

      if (level >= 3) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '分类最多支持3级嵌套',
        });
      }
    }

    // 检查同级分类名称是否重复
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId,
        parentId: parentId || null,
        name: trimmedName,
      },
    });

    if (existingCategory) {
      return res.status(409).json({
        error: 'ConflictError',
        message: '该分类名称已存在',
      });
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        parentId: parentId || null,
        userId,
        color: trimmedColor,
      },
    });

    res.status(201).json({
      message: '分类创建成功',
      category,
    });
  } catch (error) {
    console.error('[创建分类错误]', error);
    next(error);
  }
};

/**
 * 更新分类
 * PUT /api/categories/:id
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, parentId, color } = req.body;
    const userId = req.user.id;

    // 检查分类是否存在且属于当前用户
    const existingCategory = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!existingCategory) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '分类不存在',
      });
    }

    const updateData = {};

    // 更新名称
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '分类名称不能为空',
        });
      }

      const trimmedName = name.trim();

      if (trimmedName.length > 50) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '分类名称最多50个字符',
        });
      }

      // 检查同级分类名称是否重复
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          userId,
          parentId: existingCategory.parentId,
          name: trimmedName,
          id: { not: id },
        },
      });

      if (duplicateCategory) {
        return res.status(409).json({
          error: 'ConflictError',
          message: '该分类名称已存在',
        });
      }

      updateData.name = trimmedName;
    }

    // 更新颜色
    if (color !== undefined) {
      const trimmedColor = color?.trim() || null;
      if (trimmedColor && !/^#[0-9A-Fa-f]{6}$/.test(trimmedColor)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '颜色格式不正确，应为 #RRGGBB 格式',
        });
      }
      updateData.color = trimmedColor;
    }

    // 更新父分类
    if (parentId !== undefined) {
      // 如果要设置父分类
      if (parentId) {
        // 不能将自己设为自己的父分类
        if (parentId === id) {
          return res.status(400).json({
            error: 'ValidationError',
            message: '不能将自己设为父分类',
          });
        }

        // 检查目标父分类是否存在且属于当前用户
        const parentCategory = await prisma.category.findFirst({
          where: { id: parentId, userId },
        });

        if (!parentCategory) {
          return res.status(404).json({
            error: 'NotFoundError',
            message: '父分类不存在',
          });
        }

        // 检查是否会造成循环引用
        const allCategories = await prisma.category.findMany({
          where: { userId },
        });

        if (wouldCreateCycle(allCategories, id, parentId)) {
          return res.status(400).json({
            error: 'ValidationError',
            message: '不能将分类移动到其子分类下',
          });
        }

        // 检查层级限制
        let level = 1;
        let current = parentCategory;
        while (current.parentId) {
          level++;
          current = allCategories.find(cat => cat.id === current.parentId);
        }

        // 计算当前分类的子分类层级
        const getChildrenDepth = (catId, depth = 0) => {
          const children = allCategories.filter(cat => cat.parentId === catId);
          if (children.length === 0) return depth;
          return Math.max(...children.map(child => getChildrenDepth(child.id, depth + 1)));
        };

        const childrenDepth = getChildrenDepth(id);

        if (level + childrenDepth >= 3) {
          return res.status(400).json({
            error: 'ValidationError',
            message: '移动后超出3级嵌套限制',
          });
        }

        updateData.parentId = parentId;
      } else {
        // 设为顶级分类
        updateData.parentId = null;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: '分类更新成功',
      category,
    });
  } catch (error) {
    console.error('[更新分类错误]', error);
    next(error);
  }
};

/**
 * 删除分类
 * DELETE /api/categories/:id
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetCategoryId } = req.body; // 可选：将日记移动到的目标分类ID
    const userId = req.user.id;

    // 检查分类是否存在且属于当前用户
    const category = await prisma.category.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { diaries: true, children: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '分类不存在',
      });
    }

    // 如果指定了目标分类，检查是否存在且属于当前用户
    if (targetCategoryId) {
      const targetCategory = await prisma.category.findFirst({
        where: { id: targetCategoryId, userId },
      });

      if (!targetCategory) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: '目标分类不存在',
        });
      }

      if (targetCategoryId === id) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '不能将日记移动到要删除的分类',
        });
      }

      // 检查目标分类是否是当前分类的子分类
      const allCategories = await prisma.category.findMany({
        where: { userId },
      });

      const isChildCategory = getAllChildrenIds(allCategories, id).includes(targetCategoryId);
      if (isChildCategory) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '不能将日记移动到子分类',
        });
      }
    }

    // 使用事务处理删除和移动
    await prisma.$transaction(async (tx) => {
      // 如果有子分类，先删除所有子分类（递归删除）
      const deleteChildren = async (parentId) => {
        const children = await tx.category.findMany({
          where: { parentId },
        });

        for (const child of children) {
          await deleteChildren(child.id);

          // 将子分类下的日记移动或清空分类
          if (targetCategoryId) {
            await tx.diary.updateMany({
              where: { categoryId: child.id },
              data: { categoryId: targetCategoryId },
            });
          } else {
            await tx.diary.updateMany({
              where: { categoryId: child.id },
              data: { categoryId: null },
            });
          }

          await tx.category.delete({
            where: { id: child.id },
          });
        }
      };

      await deleteChildren(id);

      // 处理当前分类下的日记
      if (targetCategoryId) {
        await tx.diary.updateMany({
          where: { categoryId: id },
          data: { categoryId: targetCategoryId },
        });
      } else {
        await tx.diary.updateMany({
          where: { categoryId: id },
          data: { categoryId: null },
        });
      }

      // 删除分类
      await tx.category.delete({
        where: { id },
      });
    });

    res.json({
      message: targetCategoryId
        ? '分类已删除，相关日记已移动到指定分类'
        : '分类已删除，相关日记已设为无分类',
      movedDiaries: category._count.diaries,
      deletedChildren: category._count.children,
    });
  } catch (error) {
    console.error('[删除分类错误]', error);
    next(error);
  }
};

/**
 * 获取分类详情
 * GET /api/categories/:id
 */
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const category = await prisma.category.findFirst({
      where: { id, userId },
      include: {
        parent: {
          select: { id: true, name: true, color: true },
        },
        children: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, color: true },
        },
        _count: {
          select: { diaries: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: '分类不存在',
      });
    }

    res.json({
      category: {
        ...category,
        diaryCount: category._count.diaries,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('[获取分类详情错误]', error);
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
  getAllChildrenIds,
};