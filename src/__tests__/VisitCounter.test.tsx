import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { VisitCounter } from '@/components/VisitCounter'
import { VISIT_SESSION_KEY } from '@/lib/visitCounter'

function mockFetch(response: Response | Promise<Response>) {
  const fn = jest.fn().mockReturnValue(Promise.resolve(response))
  global.fetch = fn as unknown as typeof fetch
  return fn
}

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

describe('VisitCounter', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('첫 접속이면 POST로 집계하고 오늘/전체 값을 표시한다', async () => {
    const fetchMock = mockFetch(jsonResponse({ today: 7, total: 1234 }))

    render(<VisitCounter />)

    expect(await screen.findByText('7')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' })
    expect(sessionStorage.getItem(VISIT_SESSION_KEY)).toBe('1')
  })

  it('같은 탭에서 다시 열면 GET으로 조회만 한다', async () => {
    sessionStorage.setItem(VISIT_SESSION_KEY, '1')
    const fetchMock = mockFetch(jsonResponse({ today: 7, total: 1234 }))

    render(<VisitCounter />)

    await screen.findByText('7')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET' })
  })

  it('집계 API가 실패하면 아무것도 표시하지 않는다', async () => {
    mockFetch(jsonResponse({ error: '설정 없음' }, 503))

    const { container } = render(<VisitCounter />)

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
