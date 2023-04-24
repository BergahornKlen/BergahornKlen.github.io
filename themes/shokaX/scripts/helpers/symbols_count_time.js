'use strict'
/* global hexo */
/*
  hexo-symbols-count-time by theme-next
  under GNU Lesser General Public License v3.0
  https://github.com/theme-next/hexo-symbols-count-time/blob/master/LICENSE
 */

const { stripHTML } = require('hexo-util')

const config = hexo.config.symbols_count_time = Object.assign({
  symbols: true,
  time: true,
  total_symbols: true,
  total_time: true,
  exclude_codeblock: false,
  awl: 4,
  wpm: 275,
  suffix: 'mins.'
}, hexo.config.symbols_count_time)

function getSymbols (post) {
  return post?._content?.length ?? post?.content?.length ?? post.length
}

function getSymbolsTotal (site) {
  let symbolsResultCount = 0
  site.posts.forEach((post) => {
    symbolsResultCount += getSymbols(post)
  })
  return symbolsResultCount
}

function getFormatTime (minutes, suffix) {
  const fHours = Math.floor(minutes / 60)
  let fMinutes = Math.floor(minutes - (fHours * 60))
  if (fMinutes < 1) {
    fMinutes = 1 // 0 => 1
  }
  return fHours < 1
    ? fMinutes + ' ' + suffix // < 59 => 59 mins.
    : fHours + ':' + ('00' + fMinutes).slice(-2) // = 61 => 1:01
}

hexo.extend.helper.register('symbolsCount', function (post) {
  let symbolsResult = getSymbols(post)
  if (symbolsResult > 9999) {
    symbolsResult = Math.round(symbolsResult / 1000) + 'k' // > 9999 => 11k
  } else if (symbolsResult > 999) {
    symbolsResult = Math.round(symbolsResult / 100) / 10 + 'k' // > 999 => 1.1k
  } // < 999 => 111
  return symbolsResult
})

hexo.extend.helper.register('symbolsTime', function (post, awl = config.awl, wpm = config.wpm, suffix = config.suffix) {
  const minutes = Math.round(getSymbols(post) / (awl * wpm))
  return getFormatTime(minutes, suffix)
})

hexo.extend.helper.register('symbolsCountTotal', function (site) {
  const symbolsResultTotal = getSymbolsTotal(site)
  return symbolsResultTotal < 1000000
    ? Math.round(symbolsResultTotal / 1000) + 'k' // < 999k => 111k
    : Math.round(symbolsResultTotal / 100000) / 10 + 'm' // > 999k => 1.1m
})

hexo.extend.helper.register('symbolsTimeTotal', function (site, awl = config.awl, wpm = config.wpm, suffix = config.suffix) {
  const minutes = Math.round(getSymbolsTotal(site) / (awl * wpm))
  return getFormatTime(minutes, suffix)
})

hexo.extend.filter.register('after_post_render', (data) => {
  let { content } = data
  if (config.exclude_codeblock) content = content.replace(/<pre>.*?<\/pre>/g, '')
  data.length = stripHTML(content).replace(/\r?\n|\r/g, '').replace(/\s+/g, '').length
}, 0)
