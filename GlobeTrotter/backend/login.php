<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  echo json_encode(['ok'=>false,'error'=>'POST required']);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$email = trim($input['email'] ?? '');
$password = (string)($input['password'] ?? '');

if ($email === '' || $password === '') {
  echo json_encode(['ok'=>false,'error'=>'Email and password are required']);
  exit;
}

// Demo login. Replace with password_hash()/password_verify() and DB lookup for production.
$_SESSION['user'] = ['name'=>'Priya Traveller','email'=>$email];
echo json_encode(['ok'=>true,'user'=>$_SESSION['user']]);
