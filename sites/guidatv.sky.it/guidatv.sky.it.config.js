const dayjs = require('dayjs')
const axios = require('axios')

module.exports = {
  site: 'guidatv.sky.it',
  days: 2,
  url: function ({ date, channel }) {
    const [env, id] = channel.site_id.split('#')
    return `https://apid.sky.it/gtv/v1/events?from=${date.format('YYYY-MM-DD')}T00:00:00Z&to=${date
      .add(1, 'd')
      .format('YYYY-MM-DD')}T00:00:00Z&pageSize=999&pageNum=0&env=${env}&channels=${id}`
  },
  parser: function ({ content }) {
    const programs = []
    const data = JSON.parse(content)
    const items = data.events
    if (!items.length) return programs
    items.forEach(item => {
      const season = parseSeason(item)
      const episode = parseEpisode(item)
      programs.push({
        title: parseTitle(item),
        sub_title: parseSubTitle(item),
        description: item.eventSynopsis,
        category: parseCategory(item),
        season,
        episode,
        episodeNumbers: parseEpisodeNumbers(season, episode),
        start: parseStart(item),
        stop: parseStop(item),
        url: parseURL(item),
        image: parseImage(item)
      })
    })

    return programs
  },
  async channels() {
    const res = await axios.get('https://apid.sky.it/gtv/v1/channels?env=DTH')
    const list = res.data?.channels || []
    const channels = list.map(ch => {
      const num = (ch.number >= 251 && ch.number <= 259) ? ch.number : ''
      const hd = /\bHD\b/i.test(ch.name)
      const plus = ch.name.match(/\+(1|24)\b/)?.[1]
      const feeds = (hd ? '@HD' : '') + (plus ? (plus === '1' ? '@Plus1' : '@Plus24') : '')

      return {
        lang: 'it',
        site_id: `DTH#${ch.id}`,
        name: ch.name,
        xmltv_id: ch.name.replace(/ |HD|\+1|\+24/g, '') + num + '.it' + feeds, 
      }
    })
    return channels
  }
}

// Programmi a episodi: eventTitle è il nome dell'episodio ("Ep. 2", "Adorazione
// perpetua"), il nome della serie sta solo in epgEventTitle ("S5 Ep2 - Downton
// Abbey"). Titolo = serie, episodio nel sottotitolo (#340).
const EPISODE_TITLE = /^S\d+\s*Ep\d+\s*-\s*(.+)$/
const BARE_EPISODE = /^Ep(isodio)?\.?\s*\d+$/i

function parseSeriesName(item) {
  const match = (item.epgEventTitle || '').trim().match(EPISODE_TITLE)
  return match ? match[1].trim() : null
}

function parseTitle(item) {
  const series = parseSeriesName(item)
  if (!series) return item.eventTitle
  // Nome serie troncato da Sky ("...") : meglio il titolo evento, se dice qualcosa
  if (series.endsWith('...') && !BARE_EPISODE.test(item.eventTitle || '')) return item.eventTitle
  return series
}

function parseSubTitle(item) {
  if (!parseSeriesName(item)) return null
  const title = parseTitle(item)
  const candidates = [item.eventTitle, item.content.contentTitle]
  return candidates.find(c => c && c.trim() && c !== title) || null
}

function parseCategory(item) {
  let category = item.content.genre.name || null
  const subcategory = item.content.subgenre.name || null
  if (category && subcategory) {
    category += `/${subcategory}`
  }
  return category
}

function parseStart(item) {
  return item.starttime ? dayjs(item.starttime) : null
}

function parseStop(item) {
  return item.endtime ? dayjs(item.endtime) : null
}

function parseURL(item) {
  return item.content.url ? `https://guidatv.sky.it${item.content.url}` : null
}

function parseImage(item) {
  const images = item.content.imagesMap || []
  // landscape 16:9 first (background = HERO_CLEAN_WIDE), portrait cover as fallback
  for (const key of ['background', 'scene', 'cover']) {
    const image = images.find(i => i.key === key)
    if (image && image.img && image.img.url) return `https://guidatv.sky.it${image.img.url}`
  }

  return null
}

// Sky spesso valorizza episodeNumber ma lascia seasonNumber null: la stagione
// compare solo in url ("stagione-6/episodio-2"), titolo ("Stag. 15 Ep. 1") o
// sinossi ("S15 Ep1 ..."). Si accetta solo se l'episodio coincide (#482).
const SEASON_SOURCES = [
  [item => item.content.url, /\/stagione-(\d+)\/episodio-(\d+)(?:\/|$)/],
  [item => item.eventTitle, /\bStag\.\s*(\d+)\s*Ep\.\s*(\d+)\b/i],
  [item => item.epgEventTitle, /\bStag\.\s*(\d+)\s*Ep\.\s*(\d+)\b/i],
  [item => item.eventSynopsis, /^\s*S(\d+)\s*Ep(\d+)\b/]
]

function parseSeason(item) {
  const seasonNumber = item.content.seasonNumber
  if (seasonNumber && String(seasonNumber).length <= 2) return seasonNumber
  if (seasonNumber) return null

  const episode = parseEpisode(item)
  if (!episode) return null
  for (const [read, regex] of SEASON_SOURCES) {
    const match = (read(item) || '').match(regex)
    if (!match || Number(match[2]) !== Number(episode)) continue
    const season = Number(match[1])
    if (season >= 1 && season <= 99) return season
  }

  return null
}

// Stagione ignota: episodeNumbers espliciti, altrimenti epg-grabber assume S01
function parseEpisodeNumbers(season, episode) {
  if (season || !episode) return undefined
  return [
    { system: 'xmltv_ns', value: `.${episode - 1}.0/1` },
    { system: 'onscreen', value: `E${String(episode).padStart(2, '0')}` }
  ]
}

function parseEpisode(item) {
  if (!item.content.episodeNumber) return null
  if (String(item.content.episodeNumber).length > 3) return null
  return item.content.episodeNumber
}
