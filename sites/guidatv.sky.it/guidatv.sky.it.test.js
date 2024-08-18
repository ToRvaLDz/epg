const {parser, url} = require('./guidatv.sky.it.config.js')
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
  expect(url({channel, date})).toBe(
    'https://apid.sky.it/gtv/v1/events?from=2022-05-06T00:00:00Z&to=2022-05-07T00:00:00Z&pageSize=999&pageNum=0&env=DTH&channels=10458'
  )
})

it('can parse response', () => {
  const content =
    '{"events":[{"channel":{"id":9115,"logo":"/logo/477skyuno_Light_Fit.png?checksum=cd37fd56-01f7-443e-a62d-ff99bf4c1b1c","logoPadding":"/logo/477skyuno_Light_Padding.png?checksum=faf2bb27-9ee2-4fbe-a248-109d9baf1f84","logoDark":"/logo/477skyuno_Dark_Fit.png?checksum=1119f40f-03b4-4500-8d76-0ad03708ceec","logoDarkPadding":"/logo/477skyuno_Dark_Padding.png?checksum=1327afcd-5dc8-46ec-8813-17ecfea1aa89","logoLight":"/logo/477skyuno_Light_Padding.png?checksum=faf2bb27-9ee2-4fbe-a248-109d9baf1f84","name":"Sky Uno","description":"Il canale tv interamente dedicato all\'intrattenimento. Canale Sky Glass 108.","number":108,"servicekey":"477","category":{"id":3,"name":"Intrattenimento"}},"content":{"uuid":"58043e8c-8bba-415c-a64b-7433aef56a0c","contentTitle":"Langhe","episodeNumber":3,"seasonNumber":2,"url":"/programmi-tv/lifestyle/un-sogno-in-affitto/stagione-2/episodio-3/58043e8c-8bba-415c-a64b-7433aef56a0c","genre":{"id":4,"name":"Mondo e Tendenze"},"subgenre":{"id":26,"name":"Lifestyle"},"imagesMap":[{"key":"background","img":{"url":"/uuid/58043e8c-8bba-415c-a64b-7433aef56a0c/background?md5ChecksumParam=481c7caa39c8a9f7d121e427abda6ffa"}},{"key":"cover","img":{"url":"/uuid/58043e8c-8bba-415c-a64b-7433aef56a0c/cover?md5ChecksumParam=a8ae66249f32698c3a0d4ff6917977b0"}},{"key":"scene","img":{"url":"/uuid/58043e8c-8bba-415c-a64b-7433aef56a0c/16-9?md5ChecksumParam=75afd3ebfcac94907493c833f7b3d4fe"}},{"key":"scene_key_art","img":{"url":"/uuid/Intrattenimento_Scene_7GZn0K86e.png"}}]},"eventId":"407914365","starttime":"2024-08-17T00:35:00Z","endtime":"2024-08-17T01:30:00Z","eventTitle":"Langhe","eventSynopsis":"S2 Ep3 Langhe - Paola Marella accompagna l\'attore Sergio Assisi alla ricerca di una dimora da sogno per passare una vacanza enogastronomica con i suoi amici \'napoletani doc\' nelle Langhe.","epgEventTitle":"S2 Ep3 - Un sogno in affitto","primeVision":false,"resolutions":[{"resolutionType":"resolution4k","value":false}]}]}'
  const result = parser({content}).map(p => {
    p.start = p.start.toJSON()
    p.stop = p.stop.toJSON()
    return p
  })

  expect(result).toMatchObject([
    {
      start: '2024-08-17T00:35:00.000Z',
      stop: '2024-08-17T01:30:00.000Z',
      title: 'Un sogno in affitto',
      sub_title: 'Langhe',
      description:
        'S2 Ep3 Langhe - Paola Marella accompagna l\'attore Sergio Assisi alla ricerca di una dimora da sogno per passare una vacanza enogastronomica con i suoi amici \'napoletani doc\' nelle Langhe.',
      season: 2,
      episode: 3,
      image: 'https://guidatv.sky.it/uuid/58043e8c-8bba-415c-a64b-7433aef56a0c/cover?md5ChecksumParam=a8ae66249f32698c3a0d4ff6917977b0',
      category: 'Mondo e Tendenze/Lifestyle',
      url: 'https://guidatv.sky.it/programmi-tv/lifestyle/un-sogno-in-affitto/stagione-2/episodio-3/58043e8c-8bba-415c-a64b-7433aef56a0c'
    }
  ])
})

it('can handle empty guide', () => {
  const result = parser({
    content: '{"events":[],"total":0}'
  })
  expect(result).toMatchObject([])
})
