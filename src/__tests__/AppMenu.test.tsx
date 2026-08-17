import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppMenu } from '@/components/AppMenu'

// next/link는 App Router 컨텍스트를 요구하므로 평범한 <a>로 대체한다
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

/** 실제 헤더처럼 overflow가 걸려 내용을 잘라내는 컨테이너 */
function renderInClippingHeader() {
  return render(
    <header data-testid="header" style={{ overflowX: 'auto' }}>
      <AppMenu current="nameplate" />
    </header>
  )
}

describe('AppMenu', () => {
  it('현재 페이지 이름을 제목으로 보여준다', () => {
    renderInClippingHeader()
    expect(screen.getByRole('button', { name: /명패 제작기/ })).toBeInTheDocument()
  })

  it('제목을 누르기 전에는 메뉴가 없다', () => {
    renderInClippingHeader()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('제목을 누르면 사용 설명서 메뉴가 나타난다', async () => {
    renderInClippingHeader()
    await userEvent.click(screen.getByRole('button', { name: /명패 제작기/ }))

    const link = screen.getByRole('menuitem', { name: /사용 설명서/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/guide')
  })

  it('메뉴는 헤더 바깥(body)에 그려진다 — 헤더 overflow에 잘리지 않도록', async () => {
    const { getByTestId } = renderInClippingHeader()
    await userEvent.click(screen.getByRole('button', { name: /명패 제작기/ }))

    const menu = screen.getByRole('menu')
    // 잘라내는 헤더 안에 있으면 화면에서 보이지 않는다 (이번 버그의 원인)
    expect(getByTestId('header')).not.toContainElement(menu)
    expect(document.body).toContainElement(menu)
  })

  it('메뉴 안을 눌러도 이동 전에 닫히지 않는다', async () => {
    renderInClippingHeader()
    await userEvent.click(screen.getByRole('button', { name: /명패 제작기/ }))

    // 포털 안을 바깥 클릭으로 오인해 닫아 버리면 링크 이동이 취소된다
    await userEvent.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByRole('menuitem', { name: /사용 설명서/ }),
    })
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('바깥을 누르면 닫힌다', async () => {
    renderInClippingHeader()
    await userEvent.click(screen.getByRole('button', { name: /명패 제작기/ }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.click(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('설명서 페이지에서는 그쪽 이름을 제목으로 쓴다', () => {
    render(<AppMenu current="guide" />)
    expect(screen.getByRole('button', { name: /사용 설명서/ })).toBeInTheDocument()
  })
})
