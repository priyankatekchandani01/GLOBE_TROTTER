<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
$db = new PDO('sqlite:' . __DIR__ . '/../database/globetrotter.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('PRAGMA foreign_keys = ON');
// Backward-compatible auth migration for existing SQLite databases.
$cols = $db->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('username', $cols, true)) {
    $db->exec('ALTER TABLE users ADD COLUMN username TEXT');
    $users = $db->query("SELECT id,name,email FROM users WHERE username IS NULL OR username=''")->fetchAll(PDO::FETCH_ASSOC);
    $used = [];
    foreach ($users as $legacyUser) {
        $base = strtolower(preg_replace('/[^A-Za-z0-9_]+/', '_', trim($legacyUser['name'] ?: strstr($legacyUser['email'], '@', true))));
        $base = trim($base, '_');
        if (strlen($base) < 3) $base = 'user_' . $legacyUser['id'];
        $base = substr($base, 0, 30);
        $username = $base;
        $n = 2;
        while (in_array($username, $used, true)) {
            $suffix = '_' . $n++;
            $username = substr($base, 0, 30 - strlen($suffix)) . $suffix;
        }
        $used[] = $username;
        $q = $db->prepare('UPDATE users SET username=? WHERE id=?');
        $q->execute([$username, $legacyUser['id']]);
    }
}
$db->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)');
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
 case 'me': if(empty($_SESSION['user_id']))out(['user'=>null]);$q=$db->prepare('SELECT id,name,username,email,country,style FROM users WHERE id=?');$q->execute([$_SESSION['user_id']]);out(['user'=>$q->fetch(PDO::FETCH_ASSOC)]);
 case 'login':
    $d=body();
    $login=trim($d['login']??($d['email']??''));
    $password=$d['password']??'';
    if($login===''||$password==='')out(['error'=>'Please enter username/email and password.'],422);
    $q=$db->prepare('SELECT * FROM users WHERE username=? OR email=? LIMIT 1');
    $q->execute([$login,$login]);
    $u=$q->fetch(PDO::FETCH_ASSOC);
    if(!$u||!password_verify($password,$u['password']))out(['error'=>'Incorrect username/email or password.'],422);
    session_regenerate_id(true);
    $_SESSION['user_id']=$u['id'];
    $_SESSION['name']=$u['name'];
    $_SESSION['username']=$u['username'];
    $_SESSION['email']=$u['email'];
    unset($u['password']);
    out(['user'=>$u]);
 case 'signup':
    $d=body();
    $name=trim($d['name']??'');
    $username=trim($d['username']??'');
    $email=trim($d['email']??'');
    $password=$d['password']??'';
    $confirm=$d['confirm_password']??'';
    if($name==='')out(['error'=>'Name is required.'],422);
    if(!preg_match('/^[A-Za-z0-9_]{3,30}$/',$username))out(['error'=>'Username must be 3-30 characters and use letters, numbers or underscore.'],422);
    if(!filter_var($email,FILTER_VALIDATE_EMAIL))out(['error'=>'Enter a valid email address.'],422);
    if(strlen($password)<8)out(['error'=>'Password must contain at least 8 characters.'],422);
    if(!preg_match('/[A-Z]/',$password)||!preg_match('/[0-9]/',$password))out(['error'=>'Password must contain at least one uppercase letter and one number.'],422);
    if($password!==$confirm)out(['error'=>'Passwords do not match.'],422);
    $q=$db->prepare('SELECT id FROM users WHERE username=? OR email=? LIMIT 1');
    $q->execute([$username,$email]);
    if($q->fetch())out(['error'=>'Username or email is already registered.'],422);
    $hash=password_hash($password,PASSWORD_DEFAULT);
    $q=$db->prepare('INSERT INTO users(name,username,email,password,country,style) VALUES(?,?,?,?,?,?)');
    try{$q->execute([$name,$username,$email,$hash,'India','Balanced']);}catch(PDOException $e){out(['error'=>'Username or email is already registered.'],422);}
    session_regenerate_id(true);
    $_SESSION['user_id']=$db->lastInsertId();
    $_SESSION['name']=$name;
    $_SESSION['username']=$username;
    $_SESSION['email']=$email;
    $q=$db->prepare('SELECT id,name,username,email,country,style FROM users WHERE id=?');
    $q->execute([$_SESSION['user_id']]);
    out(['user'=>$q->fetch(PDO::FETCH_ASSOC)],201);
 case 'logout':
    $_SESSION=[];
    if(ini_get('session.use_cookies')){
        $params=session_get_cookie_params();
        setcookie(session_name(),' ',time()-42000,$params['path'],$params['domain'],$params['secure'],$params['httponly']);
    }
    session_destroy();
    out(['ok'=>true]);
 case 'profile':$uid=auth();$d=body();$q=$db->prepare('UPDATE users SET name=?,country=?,style=? WHERE id=?');$q->execute([trim($d['name']??''),trim($d['country']??''),$d['style']??'Balanced',$uid]);$q=$db->prepare('SELECT id,name,username,email,country,style FROM users WHERE id=?');$q->execute([$uid]);out(['user'=>$q->fetch(PDO::FETCH_ASSOC)]);
 case 'trips':$uid=auth();$q=$db->prepare("SELECT t.*,(SELECT COUNT(*) FROM stops s WHERE s.trip_id=t.id) stops_count,CASE WHEN date(t.end_date)>=date('now') THEN 'upcoming' ELSE 'past' END status FROM trips t WHERE t.user_id=? ORDER BY date(t.start_date) DESC");$q->execute([$uid]);out(['trips'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
 case 'trip':$uid=auth();$id=(int)($_GET['id']??0);$t=tripRow($db,$id,$uid);if(!$t)out(['error'=>'Trip not found.'],404);out(['trip'=>$t]);
 case 'create_trip':$uid=auth();$d=body();if(empty($d['name'])||empty($d['start_date'])||empty($d['end_date']))out(['error'=>'Trip name and dates are required.'],422);$cover=$d['cover']?:'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80';$q=$db->prepare('INSERT INTO trips(user_id,name,start_date,end_date,description,budget,cover,style,is_public,share_token) VALUES(?,?,?,?,?,?,?,?,0,?)');$q->execute([$uid,trim($d['name']),$d['start_date'],$d['end_date'],$d['description']??'',(float)($d['budget']??0),$cover,$d['style']??'Balanced',bin2hex(random_bytes(8))]);out(['trip'=>tripRow($db,$db->lastInsertId(),$uid)],201);
 case 'update_trip':$uid=auth();$d=body();$q=$db->prepare('UPDATE trips SET name=?,start_date=?,end_date=?,budget=? WHERE id=? AND user_id=?');$q->execute([$d['name'],$d['start_date'],$d['end_date'],(float)$d['budget'],(int)$d['id'],$uid]);out(['trip'=>tripRow($db,(int)$d['id'],$uid)]);
 case 'delete_trip':$uid=auth();$d=body();$q=$db->prepare('DELETE FROM trips WHERE id=? AND user_id=?');$q->execute([(int)$d['id'],$uid]);out(['ok'=>true]);
 case 'add_stop':$uid=auth();$d=body();$t=tripRow($db,(int)$d['trip_id'],$uid);if(!$t)out(['error'=>'Trip not found.'],404);$q=$db->prepare('INSERT INTO stops(trip_id,city,start_date,end_date) VALUES(?,?,?,?)');$q->execute([(int)$d['trip_id'],trim($d['city']),$d['start_date'],$d['end_date']]);out(['trip'=>tripRow($db,(int)$d['trip_id'],$uid)]);
 case 'add_activity':$uid=auth();$d=body();$t=tripRow($db,(int)$d['trip_id'],$uid);if(!$t)out(['error'=>'Trip not found.'],404);$stop=null;foreach($t['stops'] as $s)if(strtolower($s['city'])===strtolower($d['city'])){$stop=$s;break;}if(!$stop)out(['error'=>'Please add that city as a stop first.'],422);$q=$db->prepare('INSERT INTO activities(stop_id,name,time,cost,type,description) VALUES(?,?,?,?,?,?)');$q->execute([$stop['id'],trim($d['name']),$d['time']??'Flexible',(float)($d['cost']??0),$d['type']??'Experience',$d['description']??'']);out(['trip'=>tripRow($db,(int)$d['trip_id'],$uid)]);
 case 'discover':$q=$db->query('SELECT * FROM discover ORDER BY popular DESC,id');out(['items'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
 case 'community':$q=$db->query("SELECT p.*,u.name author FROM community_posts p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC");$posts=$q->fetchAll(PDO::FETCH_ASSOC);foreach($posts as &$p){$parts=preg_split('/\s+/',trim($p['author']));$p['initials']=strtoupper(substr($parts[0]??'G',0,1).substr($parts[count($parts)-1]??'',0,1));$p['created_at_label']=date('M j, Y',strtotime($p['created_at']));}out(['posts'=>$posts]);
 case 'toggle_share':$uid=auth();$d=body();$q=$db->prepare('UPDATE trips SET is_public=? WHERE id=? AND user_id=?');$q->execute([(int)$d['is_public'],(int)$d['id'],$uid]);out(['ok'=>true]);
 case 'public':$id=(int)($_GET['id']??0);$t=publicTrip($db,$id);if(!$t)out(['error'=>'Public trip not found.'],404);out(['trip'=>$t]);
 default:out(['error'=>'Unknown action.'],404);
 }//
}catch(Throwable $e){out(['error'=>'Server error: '.$e->getMessage()],500);}
