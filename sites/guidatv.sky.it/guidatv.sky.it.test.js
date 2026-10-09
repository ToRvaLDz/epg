const { parser, url, channels } = require('./guidatv.sky.it.config.js')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)
dayjs.extend(utc)

const date = dayjs.utc('2022-05-06', 'YYYY-MM-DD').startOf('d')
const channel = {
  site_id: 'DTH#10458',
  xmltv_id: '20Mediaset.it'
}

it('can generate valid url', () => {
  expect(url({ channel, date })).toBe(
    'https://apid.sky.it/gtv/v1/events?from=2022-05-06T00:00:00Z&to=2022-05-07T00:00:00Z&pageSize=999&pageNum=0&env=DTH&channels=10458'
  )
})

it('can parse response', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '__data__/content.json'))
  const result = parser({ content }).map(p => {
    p.start = p.start.toJSON()
    p.stop = p.stop.toJSON()
    return p
  })

  expect(result).toMatchObject([
    {
      start: '2022-05-06T00:35:40.000Z',
      stop: '2022-05-06T01:15:40.000Z',
      title: 'Distretto di Polizia',
      description:
        "S6 Ep26 La resa dei conti - Fino all'ultimo la sfida tra Ardenzi e Carrano, nemici di vecchia data, riserva clamorosi colpi di scena. E si scopre che non e' tutto come sembrava.",
      season: 6,
      episode: 26,
      image:
        'https://guidatv.sky.it/uuid/77c630aa-4744-44cb-a88e-3e871c6b73d9/background?md5ChecksumParam=88d3f48ce855316f4be25ab9bb846d32',
      category: 'Intrattenimento/Fiction',
      url: 'https://guidatv.sky.it/serie-tv/distretto-di-polizia/stagione-6/episodio-26/77c630aa-4744-44cb-a88e-3e871c6b73d9'
    }
  ])
})

it('can handle empty guide', () => {
  const result = parser({
    content: fs.readFileSync(path.resolve(__dirname, '__data__/no_content.json'))
  })
  expect(result).toMatchObject([])
})

it('can parse channel list', async () => {
  const mockResponse = fs.readFileSync(path.join(__dirname, '__data__', 'data.json'), 'utf8')
  axios.get = jest.fn().mockResolvedValue({ data: JSON.parse(mockResponse) })
  const results = await channels()

  expect(results.length).toBe(154)
  expect(results[0]).toMatchObject({
    site_id: 'DTH#9115',
    name: 'Sky Uno',
    lang: 'it',
    xmltv_id: 'SkyUno.it',
  })
  expect(results[29]).toMatchObject({
    site_id: 'DTH#9094',
    name: 'Sky Sport24',
    lang: 'it',
    xmltv_id: 'SkySport24.it',
  })
})

// ziptv2: programmi a episodi, titolo = nome serie (da epgEventTitle), episodio nel sottotitolo
describe('episode titles', () => {
  const event = ({ eventTitle, epgEventTitle, contentTitle = eventTitle }) => ({
    eventTitle,
    epgEventTitle,
    eventSynopsis: 'sinossi',
    starttime: '2026-10-02T08:30:00Z',
    endtime: '2026-10-02T09:25:00Z',
    content: {
      contentTitle,
      genre: { name: 'Intrattenimento' },
      subgenre: { name: 'Fiction' },
      imagesMap: []
    }
  })
  const parse = (...events) => parser({ content: JSON.stringify({ events }) })

  it('uses the series name when the episode has no name', () => {
    const [p] = parse(event({ eventTitle: 'Ep. 2', epgEventTitle: 'S5 Ep2 - Downton Abbey' }))
    expect(p.title).toBe('Downton Abbey')
    expect(p.sub_title).toBe('Ep. 2')
  })

  it('moves the episode name to the subtitle', () => {
    const [p] = parse(event({ eventTitle: 'Adorazione perpetua', epgEventTitle: 'S5 Ep5 - Outlander' }))
    expect(p.title).toBe('Outlander')
    expect(p.sub_title).toBe('Adorazione perpetua')
  })

  it('falls back to the content title when the event title is the series', () => {
    const [p] = parse(
      event({ eventTitle: 'Friends', epgEventTitle: 'S6 Ep21 - Friends', contentTitle: 'Incontro con papà' })
    )
    expect(p.title).toBe('Friends')
    expect(p.sub_title).toBe('Incontro con papà')
  })

  it('keeps a meaningful event title when the series name is truncated', () => {
    const [p] = parse(event({ eventTitle: 'Ep. 7', epgEventTitle: "S1 Ep7 - Hanno ucciso l'uomo ragno - La..." }))
    expect(p.title).toBe("Hanno ucciso l'uomo ragno - La...")
    const [q] = parse(event({ eventTitle: 'Il Social', epgEventTitle: 'S1 Ep4 - Super Shark - I signori de...' }))
    expect(q.title).toBe('Il Social')
  })

  it('leaves non-episodic programmes unchanged', () => {
    const [p] = parse(event({ eventTitle: 'Road House', epgEventTitle: 'Road House' }))
    expect(p.title).toBe('Road House')
    expect(p.sub_title).toBe(null)
    const [q] = parse(event({ eventTitle: 'News Line', epgEventTitle: undefined }))
    expect(q.title).toBe('News Line')
  })
})

// ziptv2: stagione ricavata da titolo/sinossi/url quando seasonNumber è null (#482)
describe('season and episode', () => {
  const event = ({ seasonNumber = null, episodeNumber = null, title = 'Programma', url, synopsis = 'sinossi' }) => ({
    eventTitle: title,
    epgEventTitle: title,
    eventSynopsis: synopsis,
    starttime: '2026-10-02T08:30:00Z',
    endtime: '2026-10-02T09:25:00Z',
    content: {
      contentTitle: title,
      seasonNumber,
      episodeNumber,
      url,
      genre: { name: 'Intrattenimento' },
      subgenre: { name: 'Fiction' },
      imagesMap: []
    }
  })
  const parse = e => parser({ content: JSON.stringify({ events: [e] }) })[0]

  it('reads the season from title and synopsis when seasonNumber is null', () => {
    const p = parse(
      event({
        episodeNumber: 1,
        title: 'Deadliest Catch - Stag. 15 Ep. 1 - La battaglia dei re',
        url: '/programmi-tv/pesca/deadliest-catch-stag-15-ep-1-la-battaglia-dei-re/uuid',
        synopsis: 'S15 Ep1 La battaglia dei re - sinossi'
      })
    )
    expect(p.season).toBe(15)
    expect(p.episode).toBe(1)
    expect(p.episodeNumbers).toBeUndefined()
  })

  it('reads a two-digit episode from the title', () => {
    const p = parse(
      event({ episodeNumber: 10, title: "Come e' fatto - Stag. 17 Ep. 10", synopsis: 'S17 Ep10 - Vi siete...' })
    )
    expect(p.season).toBe(17)
    expect(p.episodeNumbers).toBeUndefined()
  })

  it('reads the season from the synopsis only', () => {
    const p = parse(event({ episodeNumber: 2, synopsis: 'S4 Ep2 Oro nazista - sinossi' }))
    expect(p.season).toBe(4)
    expect(p.episodeNumbers).toBeUndefined()
  })

  it('reads the season from the url only', () => {
    const p = parse(event({ episodeNumber: 2, url: '/serie-tv/x/stagione-6/episodio-2/uuid' }))
    expect(p.season).toBe(6)
    expect(p.episodeNumbers).toBeUndefined()
  })

  it('ignores a derived season whose episode does not match', () => {
    const p = parse(event({ episodeNumber: 6, title: 'Serie - Stag. 3 Ep. 5' }))
    expect(p.season).toBe(null)
    expect(p.episodeNumbers).toEqual([
      { system: 'xmltv_ns', value: '.5.0/1' },
      { system: 'onscreen', value: 'E06' }
    ])
  })

  it('does not invent season 1 when the season is unknown', () => {
    const p = parse(event({ episodeNumber: 3 }))
    expect(p.season).toBe(null)
    expect(p.episode).toBe(3)
    expect(p.episodeNumbers).toEqual([
      { system: 'xmltv_ns', value: '.2.0/1' },
      { system: 'onscreen', value: 'E03' }
    ])
  })

  it('keeps a structured season untouched', () => {
    const p = parse(event({ seasonNumber: 6, episodeNumber: 26 }))
    expect(p.season).toBe(6)
    expect(p.episode).toBe(26)
    expect(p.episodeNumbers).toBeUndefined()
  })

  it('leaves programmes without episode unchanged', () => {
    const p = parse(event({}))
    expect(p.season).toBe(null)
    expect(p.episode).toBe(null)
    expect(p.episodeNumbers).toBeUndefined()
  })
})
