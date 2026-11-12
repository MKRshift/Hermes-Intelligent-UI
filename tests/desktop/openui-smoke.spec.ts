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
})
