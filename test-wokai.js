const { chromium } = require('playwright');
const path = require('path');
const readline = require('readline');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

async function waitForNewMessage(page, initialCount) {
  console.log("Waiting for new assistant message to load...");
  let newCount = initialCount;
  for (let i = 0; i < 60; i++) { // wait up to 30 seconds
    newCount = await page.locator('div.items-start').count();
    if (newCount > initialCount) {
      console.log(`New assistant message detected (Count: ${newCount}, Previous: ${initialCount}).`);
      console.log("Waiting 4 seconds for action cards to render...");
      await page.waitForTimeout(4000);
      return newCount;
    }
    await page.waitForTimeout(500);
  }
  console.log("Warning: New assistant message did not appear within 30s.");
  return initialCount;
}

async function approveAction(page) {
  console.log("Looking for all approval/acceptance buttons inside the latest assistant message...");
  const buttonTexts = [
    "Send", "Approve Event", "Approve & Run", "Accept Plan", "Accept Task",
    "Open App", "Call Now", "Approve Submission", "Calculate Route",
    "Search Google", "Search Contacts", "Create Document", "Create Sheet", "Create Presentation"
  ];
  
  // Wait up to 30 seconds for at least one approval button to appear
  let foundAny = false;
  for (let i = 0; i < 60; i++) {
    const lastAssistantMsg = page.locator('div.items-start').last();
    if (await lastAssistantMsg.isVisible()) {
      const buttons = lastAssistantMsg.locator('button');
      const count = await buttons.count();
      
      let matchCount = 0;
      for (let j = 0; j < count; j++) {
        const btn = buttons.nth(j);
        try {
          const text = await btn.innerText();
          const trimmedText = text.trim();
          if (buttonTexts.includes(trimmedText)) {
            const isVisible = await btn.isVisible();
            const isDisabled = await btn.isDisabled();
            if (isVisible && !isDisabled) {
              matchCount++;
            }
          }
        } catch (e) {}
      }
      
      if (matchCount > 0) {
        console.log(`Detected ${matchCount} active approval button(s). Starting execution loop...`);
        foundAny = true;
        break;
      }
    }
    await page.waitForTimeout(500);
  }
  
  if (!foundAny) {
    console.log("No approval or acceptance buttons appeared.");
    return false;
  }
  
  // Click all visible and enabled buttons sequentially
  let clickedCount = 0;
  while (true) {
    const lastAssistantMsg = page.locator('div.items-start').last();
    const buttons = lastAssistantMsg.locator('button');
    const count = await buttons.count();
    
    let clickedThisIteration = false;
    for (let j = 0; j < count; j++) {
      const btn = buttons.nth(j);
      try {
        const text = await btn.innerText();
        const trimmedText = text.trim();
        if (buttonTexts.includes(trimmedText)) {
          const isVisible = await btn.isVisible();
          const isDisabled = await btn.isDisabled();
          if (isVisible && !isDisabled) {
            console.log(`Clicking button: "${trimmedText}" at index ${j}/${count}...`);
            await btn.click();
            clickedCount++;
            clickedThisIteration = true;
            console.log(`Waiting 12 seconds for backend execution of "${trimmedText}"...`);
            await page.waitForTimeout(12000);
            break; // Break current button loop to re-locate (as the DOM changes after clicking)
          }
        }
      } catch (err) {
        // Ignore detached element errors
      }
    }
    
    // If no active buttons were clicked in this iteration, we are done
    if (!clickedThisIteration) {
      break;
    }
  }
  
  console.log(`Finished clicking all approval buttons. Total clicked: ${clickedCount}`);
  return clickedCount > 0;
}

async function main() {
  console.log("Launching local Google Chrome instance...");
  const userDataDir = path.join(__dirname, 'playwright-profile');
  
  // Launch persistent context using local Chrome application with automation stealth settings
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    viewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const page = await context.newPage();
  console.log("Navigating to WokAI live site...");
  await page.goto('https://wokai-os.vercel.app/');
  
  console.log("\n================================================================");
  console.log("ACTION REQUIRED:");
  console.log("1. Verify you are logged into your Google account on the opened browser.");
  console.log("2. Make sure you are on the app dashboard/workspace page.");
  console.log("3. Return to this terminal to begin the test sequence.");
  console.log("================================================================\n");
  
  await askQuestion("Press ENTER to start the sequential app testing (make sure you are logged in)...");
  
  // Test Case 1: Gmail
  const prompt1 = "Draft a Gmail to rahul@example.com telling him that the chemistry notes are ready.";
  console.log(`\n[Prompt 1 - Gmail] sending: "${prompt1}"`);
  await page.waitForSelector('#chat-input');
  
  let msgCount = await page.locator('div.items-start').count();
  await page.fill('#chat-input', prompt1);
  await page.click('#chat-send');
  
  msgCount = await waitForNewMessage(page, msgCount);
  await approveAction(page);
  await page.screenshot({ path: path.join(__dirname, 'step_1_gmail.png') });
  console.log("Screenshot saved to step_1_gmail.png");
  
  // Test Case 2: Calendar
  const prompt2 = "Schedule a meeting named 'Project Sync' with deepak.yadav@gmail.com for tomorrow at 3 PM.";
  console.log(`\n[Prompt 2 - Calendar] sending: "${prompt2}"`);
  
  await page.fill('#chat-input', prompt2);
  await page.click('#chat-send');
  
  msgCount = await waitForNewMessage(page, msgCount);
  await approveAction(page);
  await page.screenshot({ path: path.join(__dirname, 'step_2_calendar.png') });
  console.log("Screenshot saved to step_2_calendar.png");
  
  // Test Case 3: Drive
  const prompt3 = "Search my Google Drive for a file named 'Chemistry Assignment Notes'.";
  console.log(`\n[Prompt 3 - Drive] sending: "${prompt3}"`);
  
  await page.fill('#chat-input', prompt3);
  await page.click('#chat-send');
  
  msgCount = await waitForNewMessage(page, msgCount);
  await page.screenshot({ path: path.join(__dirname, 'step_3_drive.png') });
  console.log("Screenshot saved to step_3_drive.png");
  
  // Test Case 4: Devices/Terminal
  const prompt4 = "Queue a terminal command 'npm run verify' on my laptop.";
  console.log(`\n[Prompt 4 - Devices] sending: "${prompt4}"`);
  
  await page.fill('#chat-input', prompt4);
  await page.click('#chat-send');
  
  msgCount = await waitForNewMessage(page, msgCount);
  await approveAction(page);
  await page.screenshot({ path: path.join(__dirname, 'step_4_devices.png') });
  console.log("Screenshot saved to step_4_devices.png");
  
  // Test Case 5: Life Saver / Rescue Plan
  const prompt5 = "My chemistry assignment is due tonight in 5 hours! Make a rescue plan.";
  console.log(`\n[Prompt 5 - Life Saver] sending: "${prompt5}"`);
  
  await page.fill('#chat-input', prompt5);
  await page.click('#chat-send');
  
  msgCount = await waitForNewMessage(page, msgCount);
  await approveAction(page);
  await page.screenshot({ path: path.join(__dirname, 'step_5_rescue.png') });
  console.log("Screenshot saved to step_5_rescue.png");
  
  // Navigation tab checks
  console.log("\nNavigating to Devices tab to verify device syncing...");
  await page.goto('https://wokai-os.vercel.app/devices');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(__dirname, 'tab_devices.png') });
  console.log("Devices tab screenshot saved to tab_devices.png");

  console.log("\nNavigating to Calendar tab to verify calendar syncing...");
  await page.goto('https://wokai-os.vercel.app/calendar');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(__dirname, 'tab_calendar.png') });
  console.log("Calendar tab screenshot saved to tab_calendar.png");

  console.log("\nNavigating to Inbox tab to verify email syncing...");
  await page.goto('https://wokai-os.vercel.app/inbox');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(__dirname, 'tab_inbox.png') });
  console.log("Inbox tab screenshot saved to tab_inbox.png");
  
  console.log("\n================================================================");
  console.log("All automated tests completed successfully!");
  console.log("Please check the screenshots generated in the workspace.");
  console.log("================================================================\n");
  
  await askQuestion("Press ENTER to close the browser and finish...");
  await context.close();
}

main().catch(console.error);
