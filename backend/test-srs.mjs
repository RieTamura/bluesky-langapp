#!/usr/bin/env node

/**
 * Test script for SRS (Spaced Repetition System) functionality
 */

const API_BASE = 'http://localhost:3000/api';

async function testSRSFunctionality() {
  console.log('🧪 Testing SRS Functionality...\n');

  try {
    // Test 1: Login (using existing session or create one)
    console.log('1. Testing authentication...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'test.bsky.social',
        password: 'test-password'
      })
    });

    let sessionCookie = '';
    if (loginResponse.ok) {
      const cookies = loginResponse.headers.get('set-cookie');
      if (cookies) {
        sessionCookie = cookies.split(';')[0];
      }
      console.log('✅ Authentication successful');
    } else {
      console.log('⚠️  Authentication failed, continuing with existing session...');
      // For testing, we'll assume there's an existing session
      sessionCookie = 'session=test-session';
    }

    // Test 2: Get advanced learning stats
    console.log('\n2. Testing advanced learning statistics...');
    const statsResponse = await fetch(`${API_BASE}/learning/advanced-stats`, {
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Advanced stats retrieved successfully:');
      console.log('   📊 Stats:', JSON.stringify(statsData.data, null, 2));
    } else {
      const error = await statsResponse.text();
      console.log('❌ Failed to get advanced stats:', error);
    }

    // Test 3: Get review schedule
    console.log('\n3. Testing review schedule...');
    const scheduleResponse = await fetch(`${API_BASE}/learning/review-schedule`, {
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    });

    if (scheduleResponse.ok) {
      const scheduleData = await scheduleResponse.json();
      console.log('✅ Review schedule retrieved successfully:');
      console.log('   📅 Schedule:', JSON.stringify(scheduleData.data, null, 2));
    } else {
      const error = await scheduleResponse.text();
      console.log('❌ Failed to get review schedule:', error);
    }

    // Test 4: Start a quiz to test SRS algorithm
    console.log('\n4. Testing SRS-enhanced quiz...');
    const quizResponse = await fetch(`${API_BASE}/learning/quiz?count=3`, {
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    });

    if (quizResponse.ok) {
      const quizData = await quizResponse.json();
      console.log('✅ SRS-enhanced quiz started successfully:');
      console.log('   🎯 Quiz data:', JSON.stringify(quizData.data, null, 2));

      // Test 5: Submit an answer to test SRS update
      if (quizData.data.sessionId && quizData.data.currentQuestion) {
        console.log('\n5. Testing SRS algorithm with quiz answer...');
        const answerResponse = await fetch(`${API_BASE}/learning/quiz/answer`, {
          method: 'POST',
          headers: {
            'Cookie': sessionCookie,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: quizData.data.sessionId,
            answer: 'test answer',
            responseTimeMs: 3000
          })
        });

        if (answerResponse.ok) {
          const answerData = await answerResponse.json();
          console.log('✅ SRS algorithm processed answer successfully:');
          console.log('   🎯 Answer result:', JSON.stringify(answerData.data, null, 2));
        } else {
          const error = await answerResponse.text();
          console.log('❌ Failed to process SRS answer:', error);
        }
      }
    } else {
      const error = await quizResponse.text();
      console.log('❌ Failed to start SRS quiz:', error);
    }

    console.log('\n🎉 SRS functionality test completed!');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

// Run the test
testSRSFunctionality();