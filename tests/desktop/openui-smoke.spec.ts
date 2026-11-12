import { type MockBackendFixture, setupMockBackend, waitForAppReady } from './fixtures'
import { expect, test } from './test'

const reply = [
  '```openui',
  'root = Col([Title("Weekend budget"), chart, form])',
  'chart = Chart("bar", [{day: "Sat", cost: 30}, {day: "Sun", cost: 50}], "day", ["cost"])',
  '$quantity = 3',
  'form = Form([Slider($quantity, 1, 10, 1, "Quantity"), Text("Total: " + ($quantity * 125) + " NOK"), Button("Use this quantity", @ToAssistant("I chose quantity " + $quantity))])',
  '```'
].join('\n')

let fixture: MockBackendFixture | undefined

test.afterEach(async () => {
  await fixture?.cleanup()
})

test('renders an OpenUI chart and form in the transcript and drafts a follow-up', async ({}, testInfo) => {
  test.setTimeout(180_000)
  fixture = await setupMockBackend({ mockServer: { replyForPrompt: () => reply } })
  await waitForAppReady(fixture, 120_000)
  const { page, mock } = fixture
  const composer = page.locator('[contenteditable="true"]').first()
  await composer.fill('Show the OpenUI budget example')
  await composer.press('Enter')

  const widget = page.locator('.hermes-openui-original')
  await expect(widget.getByText('Weekend budget')).toBeVisible({ timeout: 60_000 })
  await expect(widget.getByRole('img', { name: 'bar chart of cost by day' })).toBeVisible()
  const followUp = widget.getByRole('button', { name: 'Use this quantity' })
  await expect(followUp).toBeEnabled()
  const slider = widget.getByRole('slider', { name: 'Quantity' })
  await expect(slider).toHaveValue('3')
  await slider.press('ArrowRight')
  await expect(widget.getByText('Total: 500 NOK')).toBeVisible()
  await followUp.click()
  await expect(composer).toContainText('I chose quantity 4')
  await expect(composer).toContainText('Form values: {"$quantity":4}')
  expect(mock.receivedPrompts).toHaveLength(1)
  await page.screenshot({ path: testInfo.outputPath('openui-transcript.png') })
  const originalMode = await widget.getAttribute('data-openui-theme')
  const toggledMode = originalMode === 'dark' ? 'light' : 'dark'
  await widget.getByText('Weekend budget', { exact: true }).click()
  await page.keyboard.press('Shift+X')
  await expect(widget).toHaveCSS('color-scheme', toggledMode)
  await expect(widget).toHaveAttribute('data-openui-theme', toggledMode)
  await expect(slider).toHaveValue('4')
})

const widgetsSelector = '.hermes-openui-original:visible'
const budgetPrompt = 'Show duplicate OpenUI budgets'
const streamingPrompt = 'Stream an editable OpenUI budget'
const streamingReply = [
  '```openui',
  'root=Col([form])',
  '$quantity=3',
  'form=Form([Slider($quantity,1,10,1,"Quantity"),Text("Total:"+($quantity*125)),Button("Continue",@ToAssistant("Quantity:"+$quantity))])',
  '$late= 7',
  '```'
].join('\n')

test('retains a value entered before the reply finishes streaming', async () => {
  test.setTimeout(180_000)
  fixture = await setupMockBackend({
    mockServer: { replyForPrompt: () => streamingReply, holdFirstStreamForPrompt: streamingPrompt }
  })
  await waitForAppReady(fixture, 120_000)
  const { page, mock } = fixture
  const composer = page.getByRole('textbox', { name: 'Message' })
  await composer.fill(streamingPrompt)
  await composer.press('Enter')
  const widget = page.locator(widgetsSelector)
  const followUp = widget.getByRole('button', { name: 'Continue', exact: true })
  try {
    await mock.waitForHeldStream()
    const slider = widget.getByRole('slider', { name: 'Quantity' })
    await expect(slider).toHaveValue('3')
    await expect(followUp).toBeDisabled()
    await slider.press('ArrowRight')
    await expect(widget.getByText('Total:500')).toBeVisible()
  } finally {
    mock.releaseHeldStream()
  }
  await expect(followUp).toBeEnabled()
  await expect(widget.getByRole('slider', { name: 'Quantity' })).toHaveValue('4')
  await followUp.click()
  await expect(composer).toContainText('Quantity:4')
  expect(mock.receivedPrompts).toHaveLength(1)
})

test('keeps identical blocks separate and restores values after returning to the chat', async () => {
  test.setTimeout(180_000)
  fixture = await setupMockBackend({ mockServer: { replyForPrompt: () => `${reply}\n\n${reply}` } })
  await waitForAppReady(fixture, 120_000)
  const { page } = fixture
  const composer = page.getByRole('textbox', { name: 'Message' })
  const sidebar = page.locator('[data-slot="sidebar"]')
  const widgets = page.locator(widgetsSelector)
  const first = widgets.nth(0).getByRole('slider', { name: 'Quantity' })
  const second = widgets.nth(1).getByRole('slider', { name: 'Quantity' })
  await composer.fill(budgetPrompt)
  await composer.press('Enter')
  await expect(widgets).toHaveCount(2, { timeout: 60_000 })
  await expect(widgets.nth(1).getByRole('button', { name: 'Use this quantity' })).toBeEnabled()
  await first.press('ArrowRight')
  await second.press('ArrowLeft')
  await expect(first).toHaveValue('4')
  await expect(second).toHaveValue('2')

  await sidebar.getByRole('button', { name: 'New session', exact: true }).click()
  await expect(widgets).toHaveCount(0)
  await composer.fill('Show budgets in another session')
  await composer.press('Enter')
  await expect(widgets).toHaveCount(2, { timeout: 60_000 })
  await expect(widgets.nth(1).getByRole('button', { name: 'Use this quantity' })).toBeEnabled()
  await expect(first).toHaveValue('3')
  await expect(second).toHaveValue('3')

  await page.reload()
  await waitForAppReady(fixture, 120_000)
  const originalTab = page.getByRole('tab', { name: /Show duplicate OpenUI/i })
  await originalTab.click()
  await expect(originalTab).toHaveAttribute('aria-selected', 'true')
  // A count of two also matches the chat we are leaving while resume loads.
  await expect(page.locator('[data-role="user"]:visible').getByText(budgetPrompt, { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(widgets).toHaveCount(2)
  await expect(first).toHaveValue('4')
  await expect(second).toHaveValue('2')
})

test('shows the source for an invalid widget and still renders the next one', async () => {
  test.setTimeout(180_000)
  const malformed = ['```openui', 'root = UnknownWidget("example")', '```'].join('\n')
  fixture = await setupMockBackend({ mockServer: { replyForPrompt: () => `${malformed}\n\n${reply}` } })
  await waitForAppReady(fixture, 120_000)
  const { page } = fixture
  const composer = page.getByRole('textbox', { name: 'Message' })
  await composer.fill('Show a broken OpenUI widget followed by a budget')
  await composer.press('Enter')
  const widgets = page.locator(widgetsSelector)
  await expect(widgets).toHaveCount(2, { timeout: 60_000 })
  await expect(widgets.nth(1).getByRole('button', { name: 'Use this quantity' })).toBeEnabled()
  await widgets.first().getByText('Could not display this interactive answer. Show source').click()
  await expect(widgets.first().locator('pre')).toContainText('root = UnknownWidget("example")')
  await expect(widgets.nth(1).getByRole('slider', { name: 'Quantity' })).toHaveValue('3')
})
