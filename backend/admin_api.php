<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
$db = new PDO('sqlite:' . __DIR__ . '/../database/globetrotter.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('PRAGMA foreign_keys = ON');
$db->exec("CREATE TABLE IF NOT EXISTS admin_users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,name TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
$check=$db->query("SELECT COUNT(*) FROM admin_users")->fetchColumn();
if(!$check){$q=$db->prepare('INSERT INTO admin_users(username,email,password,name) VALUES(?,?,?,?)');$q->execute(['admin','admin@globetrotter.com','$2y$12$ibEmQcGebWOTYqnU9vCmTuyVhO1IWag9eFOtsFNf9SqhKEgIkLplm','GlobeTrotter Admin']);}
function body(){ $raw=file_get_contents('php://input'); $d=json_decode($raw,true); return is_array($d)?$d:$_POST; }
function out($data,$code=200){http_response_code($code);echo json_encode($data);exit;}
function adminAuth(){if(empty($_SESSION['admin_id']))out(['error'=>'Admin sign in required.'],401);return (int)$_SESSION['admin_id'];}
$action=$_GET['action']??'';
try{
 switch($action){
 case 'login':
   $d=body();$login=trim($d['login']??'');$password=$d['password']??'';
   if($login===''||$password==='')out(['error'=>'Enter admin username/email and password.'],422);
   $q=$db->prepare('SELECT * FROM admin_users WHERE username=? OR email=? LIMIT 1');$q->execute([$login,$login]);$a=$q->fetch(PDO::FETCH_ASSOC);
   if(!$a||!password_verify($password,$a['password']))out(['error'=>'Invalid admin credentials.'],422);
   session_regenerate_id(true);$_SESSION['admin_id']=$a['id'];$_SESSION['admin_name']=$a['name'];unset($a['password']);out(['admin'=>$a]);
 case 'me':
   if(empty($_SESSION['admin_id']))out(['admin'=>null]);$q=$db->prepare('SELECT id,username,email,name,created_at FROM admin_users WHERE id=?');$q->execute([$_SESSION['admin_id']]);out(['admin'=>$q->fetch(PDO::FETCH_ASSOC)]);
 case 'logout':
   unset($_SESSION['admin_id'],$_SESSION['admin_name']);out(['ok'=>true]);
 case 'analytics':
   adminAuth();
   $users=(int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn();
   $trips=(int)$db->query('SELECT COUNT(*) FROM trips')->fetchColumn();
   $stops=(int)$db->query('SELECT COUNT(*) FROM stops')->fetchColumn();
   $activities=(int)$db->query('SELECT COUNT(*) FROM activities')->fetchColumn();
   $publicTrips=(int)$db->query('SELECT COUNT(*) FROM trips WHERE is_public=1')->fetchColumn();
   $topCities=$db->query("SELECT city,COUNT(*) visits FROM stops GROUP BY city ORDER BY visits DESC,city ASC LIMIT 8")->fetchAll(PDO::FETCH_ASSOC);
   $topActivities=$db->query("SELECT a.name,COUNT(*) uses,COALESCE(a.type,'Experience') type,ROUND(AVG(a.cost),2) avg_cost FROM activities a GROUP BY a.name ORDER BY uses DESC,a.name ASC LIMIT 8")->fetchAll(PDO::FETCH_ASSOC);
   $userTrends=$db->query("SELECT substr(created_at,1,7) month,COUNT(*) users FROM users GROUP BY substr(created_at,1,7) ORDER BY month ASC")->fetchAll(PDO::FETCH_ASSOC);
   $tripTrends=$db->query("SELECT substr(created_at,1,7) month,COUNT(*) trips FROM trips GROUP BY substr(created_at,1,7) ORDER BY month ASC")->fetchAll(PDO::FETCH_ASSOC);
   $recentUsers=$db->query("SELECT id,name,username,email,country,style,created_at FROM users ORDER BY id DESC LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);
   $cityCosts=$db->query("SELECT s.city,COUNT(DISTINCT s.trip_id) trips,ROUND(COALESCE(SUM(a.cost),0),2) activity_spend FROM stops s LEFT JOIN activities a ON a.stop_id=s.id GROUP BY s.city ORDER BY trips DESC,s.city ASC LIMIT 8")->fetchAll(PDO::FETCH_ASSOC);
   out(['summary'=>['users'=>$users,'trips'=>$trips,'stops'=>$stops,'activities'=>$activities,'public_trips'=>$publicTrips],'popular_cities'=>$topCities,'popular_activities'=>$topActivities,'user_trends'=>$userTrends,'trip_trends'=>$tripTrends,'recent_users'=>$recentUsers,'city_costs'=>$cityCosts]);
 case 'users':
   adminAuth();$q=$db->query('SELECT id,name,username,email,country,style,created_at FROM users ORDER BY id DESC');out(['users'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
 default:out(['error'=>'Unknown admin action.'],404);
 }
}catch(Throwable $e){out(['error'=>'Admin server error: '.$e->getMessage()],500);}
