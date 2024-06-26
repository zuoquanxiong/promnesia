/*
 * Ugh FFS.
 * NODE_OPTIONS=--experimental-vm-modules npm run test is working much better with ES6 imports/node dependenceis
 * but it segfaults every other time
 * https://github.com/nodejs/node/issues/35889
 */
import mockBrowser from "../__mocks__/browser"
global.chrome = mockBrowser


test('options', async () => {
    const {setOptions, getOptions} = await import ('../src/options')
    // shouldn't crash at least..
    const opts = await getOptions()
})
// TODO could check options migrations?

import fetch from 'node-fetch'
global.fetch = fetch


test('visits', async() => {
    const {backend, makeFakeVisits} = await import ('../src/api')

    // const opts = await getOptions()
    // opts.host = host: 'http//bad.host',
   
    // TODO have a defensive and offensive modes?
    // but defensive for network errors makes def makes sense anyway
    const vis = await backend.visits('http://123.com')
    expect(vis).toBeInstanceOf(Error)
    expect(vis.message).toMatch(/request .* failed/)
})


// meh.
mockBrowser.history.getVisits.mockImplementation(async (obj) => [])
mockBrowser.history.search   .mockImplementation(async (obj) => [])
mockBrowser.bookmarks.getTree.mockImplementation(async () => [{
    children: [{
        url: 'http:whatever.com/',
        dateAdded: 16 * 10 ** 8 * 1000,
    }],
}])

test('visits_allsources', async() => {
    const {allsources} = await import('../src/sources')

    const vis = await allsources.visits('https://whatever.com/')
    expect(vis.visits).toHaveLength(2)
    expect(vis.normalised_url).toStrictEqual('whatever.com')
})


test('search_works', async () => {
    const {allsources} = await import('../src/sources')

    // at least shouldn't crash
    const res = await allsources.search('https://123.coom')
    const [e] = res.visits
    expect(e.message).toMatch(/request .* failed/)
})

test('search_defensive', async() => {
    const {backend} = await import ('../src/api')
    const {MultiSource, bookmarks, thisbrowser} = await import ('../src/sources')


    // precondition: some error in processing history api, e.g. it's unavailable or something
    mockBrowser.history.search.mockImplementation(async (q) => null)
    mockBrowser.bookmarks.getTree.mockImplementation(async () => null)

    // TODO wtf?? for some reason default order (backend, browser, bookmarks) causes
    // 'Promise rejection was handled asynchronously'
    // I wonder if it's some issue with node fetch implementation... or just node version??
    // for some reason different order works :shrug:

    const res = await new MultiSource(thisbrowser, bookmarks, backend)
          .search('http://whatever.com')

    console.error(res.visits)
    const [e1, e2, e3] = res.visits
    // eh. fragile, but at least makes sure we test exactly the thing we want
    expect(e1.message).toMatch(/is not iterable/)
    expect(e2.message).toMatch(/Cannot read propert/)
    expect(e3.message).toMatch(/request .* failed/)
})


import fetchMock from 'jest-fetch-mock'
// TODO use it as a fixture..
// beforeEach(() => {
//   fetch.resetMocks()
// })

test('visits_badresponse', async() => {
    const {backend} = await import ('../src/api')

    fetchMock.enableMocks()
    fetchMock.mockResponse('bad!')
    const res = await backend.visits('http://mock.com')
    expect(res).toBeInstanceOf(Error)
})


test('visited', async() => {
    const {backend} = await import ('../src/api')
    const {fake} = await import ('../src/api')

    fetchMock.enableMocks()
    const [v] = fake.apiVisits(1)
    {
        fetchMock.mockOnce(`[null, ${JSON.stringify(v)}]`)
        const r = await backend.visited(['http://link1', 'http://link2'])
        expect(r).not.toBeInstanceOf(Error)
        const [r1, r2] = r
        expect(r1).toEqual(null)
        expect(r2.tags).toEqual(['fake'])
    }

    {
        // the backend is also allowed to return boolean values (for 'was visited'/'was not visited')
        // in addition, this was legacy behaviour
        fetchMock.mockOnce(`[false, true, null]`)
        let r = await backend.visited(['http://link1', 'http://link2', 'http://link3'])
        const [r1, r2, r3] = r
        expect(r1).toEqual(null)
        expect(r2).not.toEqual(null)
        expect(r3).toEqual(null)
    }
})
