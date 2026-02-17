const prisma = require('../config/database');

/**
 * 写作统计控制器
 * 提供写作热力图、心情趋势、词云、写作习惯等统计数据
 */

// 心情列表
const MOODS = ['happy', 'sad', 'excited', 'calm', 'anxious', 'angry', 'neutral'];

// 心情中文映射
const MOOD_LABELS = {
  happy: '开心',
  sad: '难过',
  excited: '兴奋',
  calm: '平静',
  anxious: '焦虑',
  angry: '生气',
  neutral: '一般',
};

// 心情颜色映射
const MOOD_COLORS = {
  happy: '#22c55e',
  sad: '#3b82f6',
  excited: '#f59e0b',
  calm: '#06b6d4',
  anxious: '#f97316',
  angry: '#ef4444',
  neutral: '#6b7280',
};

/**
 * 获取写作热力图数据
 * 返回过去一年的每日写作数量
 */
const getHeatmapData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 计算一年前的日期
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);

    // 获取用户的日记数据
    const diaries = await prisma.diary.findMany({
      where: {
        userId,
        createdAt: {
          gte: oneYearAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // 按日期分组统计
    const dateMap = new Map();
    
    diaries.forEach((diary) => {
      const dateStr = diary.createdAt.toISOString().split('T')[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    });

    // 生成完整的热力图数据（包含所有日期，没有写作的日期count为0）
    const heatmapData = [];
    const today = new Date();
    
    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      heatmapData.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }

    // 计算统计数据
    const totalDays = heatmapData.filter(d => d.count > 0).length;
    const maxCount = Math.max(...heatmapData.map(d => d.count), 0);
    const totalDiaries = heatmapData.reduce((sum, d) => sum + d.count, 0);

    res.json({
      data: heatmapData,
      stats: {
        totalDays,
        maxCount,
        totalDiaries,
        startDate: oneYearAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('[获取热力图数据错误]', error);
    next(error);
  }
};

/**
 * 获取心情趋势数据
 * 按月统计各种心情的数量
 */
const getMoodTrend = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 获取过去12个月的数据
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    // 获取日记数据
    const diaries = await prisma.diary.findMany({
      where: {
        userId,
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        mood: true,
        createdAt: true,
      },
    });

    // 生成月份标签
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(twelveMonthsAgo);
      d.setMonth(d.getMonth() + i);
      months.push(`${d.getMonth() + 1}月`);
    }

    // 初始化心情数据
    const moodData = {};
    MOODS.forEach((mood) => {
      moodData[mood] = {
        label: MOOD_LABELS[mood],
        color: MOOD_COLORS[mood],
        data: new Array(12).fill(0),
      };
    });

    // 统计每月心情数量
    diaries.forEach((diary) => {
      const diaryDate = new Date(diary.createdAt);
      const monthIndex = 
        (diaryDate.getFullYear() - twelveMonthsAgo.getFullYear()) * 12 +
        (diaryDate.getMonth() - twelveMonthsAgo.getMonth());
      
      if (monthIndex >= 0 && monthIndex < 12 && moodData[diary.mood]) {
        moodData[diary.mood].data[monthIndex]++;
      }
    });

    // 转换为响应格式
    const moods = {};
    Object.entries(moodData).forEach(([mood, info]) => {
      moods[mood] = info.data;
    });

    res.json({
      months,
      moods,
      moodLabels: MOOD_LABELS,
      moodColors: MOOD_COLORS,
    });
  } catch (error) {
    console.error('[获取心情趋势错误]', error);
    next(error);
  }
};

/**
 * 获取词云数据
 * 提取日记中的高频词汇
 */
const getWordCloudData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 获取所有日记内容
    const diaries = await prisma.diary.findMany({
      where: { userId },
      select: {
        title: true,
        content: true,
        tags: true,
      },
    });

    // 提取所有文本内容
    let allText = '';
    diaries.forEach((diary) => {
      allText += ' ' + diary.title;
      // 去除HTML标签
      const textContent = diary.content.replace(/<[^>]+>/g, ' ');
      allText += ' ' + textContent;
      
      // 添加标签
      try {
        const tags = JSON.parse(diary.tags || '[]');
        allText += ' ' + tags.join(' ');
      } catch {
        // 忽略解析错误
      }
    });

    // 分词统计
    const wordCount = new Map();
    
    // 使用简单的中文分词（按字符和常用词模式）
    // 同时处理英文单词
    const text = allText.toLowerCase();
    
    // 提取英文单词
    const englishWords = text.match(/[a-z]{2,}/g) || [];
    englishWords.forEach((word) => {
      if (word.length >= 2 && !isStopWord(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    // 提取中文词汇（2-4个字的词）
    const chineseChars = text.replace(/[^\u4e00-\u9fa5]/g, '');
    
    // 常见停用词
    const chineseStopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这',
    ]);

    // 使用简单的滑动窗口提取中文词
    const extractChineseWords = (str) => {
      const words = [];
      // 2字词
      for (let i = 0; i < str.length - 1; i++) {
        words.push(str.substring(i, i + 2));
      }
      // 3字词
      for (let i = 0; i < str.length - 2; i++) {
        words.push(str.substring(i, i + 3));
      }
      // 4字词
      for (let i = 0; i < str.length - 3; i++) {
        words.push(str.substring(i, i + 4));
      }
      return words;
    };

    const chineseWords = extractChineseWords(chineseChars);
    chineseWords.forEach((word) => {
      if (!chineseStopWords.has(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    // 转换为数组并排序
    let words = Array.from(wordCount.entries())
      .map(([text, count]) => ({ text, count }))
      .filter((item) => item.count >= 2) // 至少出现2次
      .sort((a, b) => b.count - a.count)
      .slice(0, 100); // 最多100个词

    // 添加标签权重
    const tagWeight = new Map();
    diaries.forEach((diary) => {
      try {
        const tags = JSON.parse(diary.tags || '[]');
        tags.forEach((tag) => {
          tagWeight.set(tag, (tagWeight.get(tag) || 0) + 3); // 标签权重更高
        });
      } catch {
        // 忽略解析错误
      }
    });

    // 合并标签权重
    words = words.map((word) => {
      const tagBonus = tagWeight.get(word.text) || 0;
      return {
        ...word,
        count: word.count + tagBonus,
      };
    });

    // 重新排序
    words.sort((a, b) => b.count - a.count);

    res.json({ words });
  } catch (error) {
    console.error('[获取词云数据错误]', error);
    next(error);
  }
};

/**
 * 判断是否为英文停用词
 */
function isStopWord(word) {
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye', 'too', 'any', 'say', 'man', 'try', 'ask', 'end', 'why', 'let', 'put', 'say', 'she', 'too', 'old', 'tell', 'very', 'when', 'much', 'would', 'there', 'their', 'said', 'each', 'which', 'will', 'about', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'while', 'this', 'that', 'with', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'than', 'them', 'well', 'were', 'over', 'also', 'back', 'only', 'just', 'even', 'more', 'here', 'look', 'down', 'most', 'long', 'last', 'find', 'give', 'does', 'made', 'part', 'such', 'take', 'come', 'made', 'like', 'into', 'year', 'your', 'work', 'life', 'even', 'what', 'have', 'been', 'have', 'said', 'each', 'which', 'will', 'about', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'while',
  ]);
  return stopWords.has(word);
}

/**
 * 获取写作习惯数据
 * 统计一天中各时间段的写作分布
 */
const getWritingHabits = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 获取所有日记的创建时间
    const diaries = await prisma.diary.findMany({
      where: { userId },
      select: {
        createdAt: true,
      },
    });

    // 初始化24小时数据
    const hourCounts = new Array(24).fill(0);
    
    diaries.forEach((diary) => {
      const hour = new Date(diary.createdAt).getHours();
      hourCounts[hour]++;
    });

    // 生成小时标签
    const hours = Array.from({ length: 24 }, (_, i) => {
      return `${String(i).padStart(2, '0')}:00`;
    });

    // 计算写作习惯统计
    const totalDiaries = diaries.length;
    
    // 找出写作高峰时段
    const maxCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter((item) => item.count === maxCount && maxCount > 0)
      .map((item) => `${String(item.hour).padStart(2, '0')}:00`);

    // 计算时间段分布
    const timeRanges = {
      morning: { label: '早晨 (6-12点)', count: 0 },      // 6-12
      afternoon: { label: '下午 (12-18点)', count: 0 },   // 12-18
      evening: { label: '晚上 (18-22点)', count: 0 },     // 18-22
      night: { label: '深夜 (22-6点)', count: 0 },        // 22-6
    };

    hourCounts.forEach((count, hour) => {
      if (hour >= 6 && hour < 12) {
        timeRanges.morning.count += count;
      } else if (hour >= 12 && hour < 18) {
        timeRanges.afternoon.count += count;
      } else if (hour >= 18 && hour < 22) {
        timeRanges.evening.count += count;
      } else {
        timeRanges.night.count += count;
      }
    });

    // 找出主要写作时段
    const mainTimeRange = Object.entries(timeRanges)
      .sort((a, b) => b[1].count - a[1].count)[0];

    res.json({
      hours,
      counts: hourCounts,
      stats: {
        totalDiaries,
        peakHours,
        maxCount,
        timeRanges,
        mainTimeRange: mainTimeRange ? {
          key: mainTimeRange[0],
          ...mainTimeRange[1],
        } : null,
      },
    });
  } catch (error) {
    console.error('[获取写作习惯错误]', error);
    next(error);
  }
};

/**
 * 获取综合统计数据
 * 一次性返回所有统计数据
 */
const getAllStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 并行获取所有统计数据
    const [
      heatmapResult,
      moodTrendResult,
      wordCloudResult,
      writingHabitsResult,
    ] = await Promise.all([
      getHeatmapDataInternal(userId),
      getMoodTrendInternal(userId),
      getWordCloudInternal(userId),
      getWritingHabitsInternal(userId),
    ]);

    res.json({
      heatmap: heatmapResult,
      moodTrend: moodTrendResult,
      wordCloud: wordCloudResult,
      writingHabits: writingHabitsResult,
    });
  } catch (error) {
    console.error('[获取综合统计数据错误]', error);
    next(error);
  }
};

// 内部方法用于综合统计
async function getHeatmapDataInternal(userId) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(0, 0, 0, 0);

  const diaries = await prisma.diary.findMany({
    where: {
      userId,
      createdAt: { gte: oneYearAgo },
    },
    select: { createdAt: true },
  });

  const dateMap = new Map();
  diaries.forEach((diary) => {
    const dateStr = diary.createdAt.toISOString().split('T')[0];
    dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
  });

  const heatmapData = [];
  const today = new Date();
  for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    heatmapData.push({
      date: dateStr,
      count: dateMap.get(dateStr) || 0,
    });
  }

  return {
    data: heatmapData,
    stats: {
      totalDays: heatmapData.filter((d) => d.count > 0).length,
      maxCount: Math.max(...heatmapData.map((d) => d.count), 0),
      totalDiaries: heatmapData.reduce((sum, d) => sum + d.count, 0),
    },
  };
}

async function getMoodTrendInternal(userId) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const diaries = await prisma.diary.findMany({
    where: {
      userId,
      createdAt: { gte: twelveMonthsAgo },
    },
    select: {
      mood: true,
      createdAt: true,
    },
  });

  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo);
    d.setMonth(d.getMonth() + i);
    months.push(`${d.getMonth() + 1}月`);
  }

  const moodData = {};
  MOODS.forEach((mood) => {
    moodData[mood] = new Array(12).fill(0);
  });

  diaries.forEach((diary) => {
    const diaryDate = new Date(diary.createdAt);
    const monthIndex =
      (diaryDate.getFullYear() - twelveMonthsAgo.getFullYear()) * 12 +
      (diaryDate.getMonth() - twelveMonthsAgo.getMonth());
    if (monthIndex >= 0 && monthIndex < 12 && moodData[diary.mood]) {
      moodData[diary.mood][monthIndex]++;
    }
  });

  return { months, moods: moodData, moodLabels: MOOD_LABELS, moodColors: MOOD_COLORS };
}

async function getWordCloudInternal(userId) {
  const diaries = await prisma.diary.findMany({
    where: { userId },
    select: { title: true, content: true, tags: true },
  });

  let allText = '';
  diaries.forEach((diary) => {
    allText += ' ' + diary.title;
    const textContent = diary.content.replace(/<[^>]+>/g, ' ');
    allText += ' ' + textContent;
    try {
      const tags = JSON.parse(diary.tags || '[]');
      allText += ' ' + tags.join(' ');
    } catch {}
  });

  const wordCount = new Map();
  const text = allText.toLowerCase();
  const englishWords = text.match(/[a-z]{2,}/g) || [];
  englishWords.forEach((word) => {
    if (word.length >= 2 && !isStopWord(word)) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  });

  const chineseChars = text.replace(/[^\u4e00-\u9fa5]/g, '');
  const chineseStopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);

  for (let i = 0; i < chineseChars.length - 1; i++) {
    const word = chineseChars.substring(i, i + 2);
    if (!chineseStopWords.has(word)) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  }

  let words = Array.from(wordCount.entries())
    .map(([text, count]) => ({ text, count }))
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);

  return { words };
}

async function getWritingHabitsInternal(userId) {
  const diaries = await prisma.diary.findMany({
    where: { userId },
    select: { createdAt: true },
  });

  const hourCounts = new Array(24).fill(0);
  diaries.forEach((diary) => {
    const hour = new Date(diary.createdAt).getHours();
    hourCounts[hour]++;
  });

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  // 计算写作高峰时段
  const maxCount = Math.max(...hourCounts);
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter((item) => item.count === maxCount && maxCount > 0)
    .map((item) => `${String(item.hour).padStart(2, '0')}:00`);

  // 计算时间段分布
  const timeRanges = {
    morning: { label: '早晨 (6-12点)', count: 0 },
    afternoon: { label: '下午 (12-18点)', count: 0 },
    evening: { label: '晚上 (18-22点)', count: 0 },
    night: { label: '深夜 (22-6点)', count: 0 },
  };

  hourCounts.forEach((count, hour) => {
    if (hour >= 6 && hour < 12) {
      timeRanges.morning.count += count;
    } else if (hour >= 12 && hour < 18) {
      timeRanges.afternoon.count += count;
    } else if (hour >= 18 && hour < 22) {
      timeRanges.evening.count += count;
    } else {
      timeRanges.night.count += count;
    }
  });

  // 找出主要写作时段
  const mainTimeRange = Object.entries(timeRanges)
    .sort((a, b) => b[1].count - a[1].count)[0];

  return {
    hours,
    counts: hourCounts,
    stats: {
      totalDiaries: diaries.length,
      maxCount,
      peakHours,
      mainTimeRange: mainTimeRange ? {
        key: mainTimeRange[0],
        ...mainTimeRange[1],
      } : null,
    },
  };
}

module.exports = {
  getHeatmapData,
  getMoodTrend,
  getWordCloudData,
  getWritingHabits,
  getAllStats,
};