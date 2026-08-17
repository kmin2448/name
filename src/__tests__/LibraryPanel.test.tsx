import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LibraryPanel } from '@/components/LibraryPanel'
import { initialState } from '@/hooks/useNameplateState'
import { extractRosterPayload } from '@/lib/rosters'
import { DRIVE_UPGRADE_AUTH_PARAMS } from '@/lib/googleScopes'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

import { signIn, useSession } from 'next-auth/react'

const mockUseSession = useSession as unknown as jest.Mock
const mockSignIn = signIn as unknown as jest.Mock

type SessionShape = { user?: { email?: string }; hasDriveScope?: boolean } | null

function setSession(session: SessionShape) {
  mockUseSession.mockReturnValue({
    data: session,
    status: session ? 'authenticated' : 'unauthenticated',
  })
}

/** 서버 응답을 경로별로 흉내 낸다 */
function mockApi(routes: Record<string, { status: number; body?: unknown }>) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : String(input)
    const key = Object.keys(routes).find((k) => url.startsWith(k)) ?? ''
    const route = routes[key] ?? { status: 404 }
    return {
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      json: async () => route.body ?? {},
    } as Response
  }) as unknown as typeof fetch
}

function renderPanel(open = true) {
  return render(
    <LibraryPanel
      open={open}
      onOpenChange={() => {}}
      showHint
      state={initialState}
      getRosterPayload={() => extractRosterPayload(initialState)}
      onLoadRoster={() => {}}
      onApplyDesign={() => {}}
      pageCount={3}
    />
  )
}

describe('LibraryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApi({
      '/api/rosters': { status: 200, body: { items: [] } },
      '/api/designs': { status: 200, body: { items: [] } },
    })
  })

  it('서버에 로그인 설정이 없으면(503) 아무것도 그리지 않는다', async () => {
    setSession(null)
    mockApi({ '/api/rosters': { status: 503 } })

    const { container } = renderPanel()
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('로그인 전에는 로그인 버튼과 함께 기본 범위만 쓴다고 안내한다', async () => {
    setSession(null)
    renderPanel()

    expect(await screen.findByRole('button', { name: /구글로 로그인/ })).toBeInTheDocument()
    // 로그인 단계에서는 드라이브 권한을 요청하지 않는다 (증분 인증)
    expect(screen.getByText(/이름·이메일 정보만/)).toBeInTheDocument()
    expect(screen.getByText(/구글 드라이브 등 다른 권한은 요청하지 않습니다/)).toBeInTheDocument()
    expect(screen.getByText(/디자인 기능을 처음 쓸 때/)).toBeInTheDocument()
    expect(screen.getByText(/명단 관리는 그대로 이용/)).toBeInTheDocument()
    // 로그인 전에는 탭이 없다
    expect(screen.queryByRole('button', { name: '디자인' })).not.toBeInTheDocument()
  })

  it('버튼 옆 안내 문구는 명단과 디자인을 함께 안내한다', async () => {
    setSession(null)
    renderPanel(false)

    expect(
      await screen.findByText('구글로 로그인하여 작성 명단/ 디자인을 관리하세요.')
    ).toBeInTheDocument()
  })

  it('로그인하면 한 창에서 명단·디자인 탭을 오갈 수 있다', async () => {
    setSession({ user: { email: 'me@example.com' }, hasDriveScope: true })
    renderPanel()

    // 기본은 명단 탭
    expect(await screen.findByText(/현재 명단 저장/)).toBeInTheDocument()
    expect(screen.queryByText(/현재 디자인 저장/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '디자인' }))

    expect(await screen.findByText(/현재 디자인 저장/)).toBeInTheDocument()
    expect(screen.getByText('저장값으로 덮어쓰기')).toBeInTheDocument()
    expect(screen.getByText('현재 서식 유지')).toBeInTheDocument()
    expect(screen.queryByText(/현재 명단 저장/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '명단' }))
    expect(await screen.findByText(/현재 명단 저장/)).toBeInTheDocument()
  })

  it('드라이브 권한이 없으면 디자인 탭에서만 재승인 안내를 보여준다', async () => {
    setSession({ user: { email: 'me@example.com' }, hasDriveScope: false })
    renderPanel()

    // 명단 탭은 정상 동작
    expect(await screen.findByText(/현재 명단 저장/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '디자인' }))

    expect(await screen.findByRole('button', { name: '드라이브 권한 허용하기' })).toBeInTheDocument()
    expect(screen.queryByText(/현재 디자인 저장/)).not.toBeInTheDocument()
  })

  it('드라이브 권한 허용 버튼은 드라이브 범위를 더해 다시 인증한다', async () => {
    setSession({ user: { email: 'me@example.com' }, hasDriveScope: false })
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: '디자인' }))
    await userEvent.click(await screen.findByRole('button', { name: '드라이브 권한 허용하기' }))

    expect(mockSignIn).toHaveBeenCalledWith('google', undefined, DRIVE_UPGRADE_AUTH_PARAMS)
  })
})
