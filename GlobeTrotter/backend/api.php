<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
$db = new PDO('sqlite:' . __DIR__ . '/../database/globetrotter.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('PRAGMA foreign_keys = ON');
function body(){ $raw=file_get_contents('php://input'); $d=json_decode($raw,true); return is_array($d)?$d:$_POST; }
function out($data,$code=200){ http_response_code($code); echo json_encode($data); exit; }
function auth(){ if(empty($_SESSION['user_id'])) out(['error'=>'Please sign in.'],401); return (int)$_SESSION['user_id']; }
function tripRow($db,$id,$uid=null){
 $q=$db->prepare('SELECT t.*, (SELECT COUNT(*) FROM stops s WHERE s.trip_id=t.id) stops_count FROM trips t WHERE t.id=?'.($uid!==null?' AND t.user_id=?':'')); $q->execute($uid!==null?[$id,$uid]:[$id]); $t=$q->fetch(PDO::FETCH_ASSOC); if(!$t)return null;
 $s=$db->prepare('SELECT * FROM stops WHERE trip_id=? ORDER BY start_date,id');$s->execute([$id]);$stops=$s->fetchAll(PDO::FETCH_ASSOC);
 foreach($stops as &$stop){$a=$db->prepare('SELECT * FROM activities WHERE stop_id=? ORDER BY time,id');$a->execute([$stop['id']]);$stop['activities']=$a->fetchAll(PDO::FETCH_ASSOC);}
 $t['stops']=$stops; $total=0; foreach($stops as $ss){ foreach($ss['activities'] as $aa){$total+=(float)$aa['cost'];}} $t['spent']=$total; $t['activities_cost']=$total; return $t;
}
function publicTrip($db,$id){return tripRow($db,$id,null);}
$action=$_GET['action']??'';
try{
 switch($action){
 case 'me': if(empty($_SESSION['user_id']))out(['user'=>null]);$q=$db->prepare('SELECT id,name,email,country,style FROM users WHERE id=?');$q->execute([$_SESSION['user_id']]);out(['user'=>$q->fetch(PDO::FETCH_ASSOC)]);
 case 'login': $d=body();$q=$db->prepare('SELECT * FROM users WHERE email=?');$q->execute([trim($d['email']??'')]);$u=$q->fetch(PDO::FETCH_ASSOC);if(!$u||!password_verify($d['password']??'',$u['password']))out(['error'=>'Invalid email or password.'],422);$_SESSION['user_id']=$u['id'];unset($u['password']);out(['user'=>$u]);
 case 'signup': $d=body();$email=trim($d['email']??'');if(!$email||strlen($d['password']??'')<6)out(['error'=>'Enter a valid email and password of at least 6 characters.'],422);$q=$db->prepare('SELECT id FROM users WHERE email=?');$q->execute([$email]);if($q->fetch())out(['error'=>'An account with this email already exists.'],422);$name=trim(($d['first']??'').' '.($d['last']??''));$q=$db->prepare('INSERT INTO users(name,email,password,country,style) VALUES(?,?,?,?,?)');$q->execute([$name,$email,password_hash($d['password'],PASSWORD_DEFAULT),'India','Balanced']);$_SESSION['user_id']=$db->lastInsertId();$q=$db->prepare('SELECT id,name,email,country,style FROM users WHERE id=?');$q->execute([$_SESSION['user_id']]);out(['user'=>$q->fetch(PDO::FETCH_ASSOC)],201);
 case 'logout':session_destroy();out(['ok'=>true]);
 case 'profile':$uid=auth();$d=body();$q=$db->prepare('UPDATE users SET name=?,country=?,style=? WHERE id=?');$q->execute([trim($d['name']??''),trim($d['country']??''),$d['style']??'Balanced',$uid]);$q=$db->prepare('SELECT id,name,email,country,style FROM users WHERE id=?');$q->execute([$uid]);out(['user'=>$q->fetch(PDO::FETCH_ASSOC)]);
 case 'trips':$uid=auth();$q=$db->prepare("SELECT t.*,(SELECT COUNT(*) FROM stops s WHERE s.trip_id=t.id) stops_count,CASE WHEN date(t.end_date)>=date('now') THEN 'upcoming' ELSE 'past' END status FROM trips t WHERE t.user_id=? ORDER BY date(t.start_date) DESC");$q->execute([$uid]);out(['trips'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
 case 'trip':$uid=auth();$id=(int)($_GET['id']??0);$t=tripRow($db,$id,$uid);if(!$t)out(['error'=>'Trip not found.'],404);out(['trip'=>$t]);
 case 'create_trip':$uid=auth();$d=body();if(empty($d['name'])||empty($d['start_date'])||empty($d['end_date']))out(['error'=>'Trip name and dates are required.'],422);$cover=$d['cover']?:'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80';$q=$db->prepare('INSERT INTO trips(user_id,name,start_date,end_date,description,budget,cover,style,is_public,share_token) VALUES(?,?,?,?,?,?,?,?,0,?)');$q->execute([$uid,trim($d['name']),$d['start_date'],$d['end_date'],$d['description']??'',(float)($d['budget']??0),$cover,$d['style']??'Balanced',bin2hex(random_bytes(8))]);out(['trip'=>tripRow($db,$db->lastInsertId(),$uid)],201);
 case 'update_trip':$uid=auth();$d=body();$q=$db->prepare('UPDATE trips SET name=?,start_date=?,end_date=?,budget=? WHERE id=? AND user_id=?');$q->execute([$d['name'],$d['start_date'],$d['end_date'],(float)$d['budget'],(int)$d['id'],$uid]);out(['trip'=>tripRow($db,(int)$d['id'],$uid)]);
 case 'delete_trip':$uid=auth();$d=body();$q=$db->prepare('DELETE FROM trips WHERE id=? AND user_id=?');$q->execute([(int)$d['id'],$uid]);out(['ok'=>true]);
 case 'add_stop':$uid=auth();$d=body();$t=tripRow($db,(int)$d['trip_id'],$uid);if(!$t)out(['error'=>'Trip not found.'],404);$q=$db->prepare('INSERT INTO stops(trip_id,city,start_date,end_date) VALUES(?,?,?,?)');$q->execute([(int)$d['trip_id'],trim($d['city']),$d['start_date'],$d['end_date']]);out(['trip'=>tripRow($db,(int)$d['trip_id'],$uid)]);
 case 'add_activity':$uid=auth();$d=body();$t=tripRow($db,(int)$d['trip_id'],$uid);if(!$t)out(['error'=>'Trip not found.'],404);$stop=null;foreach($t['stops'] as $s)if(strtolower($s['city'])===strtolower($d['city'])){$stop=$s;break;}if(!$stop)out(['error'=>'Please add that city as a stop first.'],422);$q=$db->prepare('INSERT INTO activities(stop_id,name,time,cost,type,description) VALUES(?,?,?,?,?,?)');$q->execute([$stop['id'],trim($d['name']),$d['time']??'Flexible',(float)($d['cost']??0),$d['type']??'Experience',$d['description']??'']);out(['trip'=>tripRow($db,(int)$d['trip_id'],$uid)]);
 case 'discover':$q=$db->query('SELECT * FROM discover ORDER BY popular DESC,id');out(['items'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
 case 'toggle_share':$uid=auth();$d=body();$q=$db->prepare('UPDATE trips SET is_public=? WHERE id=? AND user_id=?');$q->execute([(int)$d['is_public'],(int)$d['id'],$uid]);out(['ok'=>true]);
 case 'public':$id=(int)($_GET['id']??0);$t=publicTrip($db,$id);if(!$t)out(['error'=>'Public trip not found.'],404);out(['trip'=>$t]);
 default:out(['error'=>'Unknown action.'],404);
 }
}catch(Throwable $e){out(['error'=>'Server error: '.$e->getMessage()],500);}
